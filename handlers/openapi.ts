// handlers/openapi.ts
import { render } from "../core/renderer.ts";
import { fromOpenAPI, OpenAPIDoc } from "../adapters/openapi.ts";
import { OutputFormat } from "../types/api_spec.ts";
import { GenerateError } from "./generate.ts";
import { ParseError } from "../core/parser.ts";

// ── Content-Type lookup ───────────────────────────
const CONTENT_TYPES: Record<OutputFormat, string> = {
  [OutputFormat.Markdown]: "text/markdown; charset=utf-8",
  [OutputFormat.HTML]: "text/html; charset=utf-8",
  [OutputFormat.JSON]: "application/json; charset=utf-8",
};

function isOpenAPIDoc(x: unknown): x is OpenAPIDoc {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o["info"] !== "object" || o["info"] === null) return false;
  const info = o["info"] as Record<string, unknown>;
  if (typeof info["title"] !== "string" || typeof info["version"] !== "string") return false;
  // Must have either openapi or swagger version
  return typeof o["openapi"] === "string" || typeof o["swagger"] === "string";
}

function resolveFormat(req: Request): OutputFormat {
  const url = new URL(req.url);
  const q = url.searchParams.get("format")?.toLowerCase();

  if (q === "html") return OutputFormat.HTML;
  if (q === "json") return OutputFormat.JSON;
  if (q === "markdown") return OutputFormat.Markdown;

  // Fallback: Accept header
  const accept = req.headers.get("Accept") ?? "";
  if (accept.includes("text/html")) return OutputFormat.HTML;
  if (accept.includes("application/json")) return OutputFormat.JSON;

  return OutputFormat.Markdown;
}

export async function handleOpenAPIImport(req: Request): Promise<Response> {
  const format = resolveFormat(req);

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ParseError("Invalid JSON body");
    }

    if (!isOpenAPIDoc(body)) {
      throw new ParseError(
        "Request body is not a valid OpenAPI document (missing openapi/swagger version or info)",
      );
    }

    const doc = fromOpenAPI(body);
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
    console.error("Unexpected error in /import/openapi:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
