// handlers/generate.ts
import { parseBody, isApiSpec, ParseError } from "../core/parser.ts";
import { generate } from "../core/generator.ts";
import { render } from "../core/renderer.ts";
import { OutputFormat } from "../types/api_spec.ts";

// ── Custom business error ─────────────────────────
export class GenerateError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GenerateError";
  }
}

// ── Content-Type lookup ───────────────────────────
const CONTENT_TYPES: Record<OutputFormat, string> = {
  [OutputFormat.Markdown]: "text/markdown; charset=utf-8",
  [OutputFormat.HTML]:     "text/html; charset=utf-8",
  [OutputFormat.JSON]:     "application/json; charset=utf-8",
};

// ── Main handler ──────────────────────────────────
export async function handleGenerate(req: Request): Promise<Response> {
  const format = resolveFormat(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const spec = parseBody(body, isApiSpec);
    const doc  = generate(spec);
    const output = render(doc, format);

    return new Response(output, {
      status: 200,
      headers: { "Content-Type": CONTENT_TYPES[format] },
    });
  } catch (e) {
    if (e instanceof ParseError) {
      return new Response(
        JSON.stringify({ error: e.message, field: e.field }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (e instanceof GenerateError) {
      return new Response(
        JSON.stringify({ error: e.message }),
        { status: e.status, headers: { "Content-Type": "application/json" } },
      );
    }
    // Unexpected errors → 500 + log
    console.error("Unexpected error in /generate:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// ── Format resolution: query param → Accept header → default
function resolveFormat(req: Request): OutputFormat {
  let q: string | null = null;
  try {
    const url = new URL(req.url, "http://localhost");
    q = url.searchParams.get("format")?.toLowerCase() ?? null;
  } catch {
    // req.url may be a relative path, try to extract format manually
    const match = req.url.match(/[?&]format=([^&]+)/);
    q = match ? match[1].toLowerCase() : null;
  }

  if (q === "html") return OutputFormat.HTML;
  if (q === "json") return OutputFormat.JSON;
  if (q === "markdown") return OutputFormat.Markdown;

  // Fallback: Accept header
  const accept = req.headers.get("Accept") ?? "";
  if (accept.includes("text/html")) return OutputFormat.HTML;
  if (accept.includes("application/json")) return OutputFormat.JSON;

  return OutputFormat.Markdown;
}
