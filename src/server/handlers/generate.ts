// handlers/generate.ts
import type { Request, Response } from "express";
import { parseBody, isApiSpec, ParseError } from "../core/parser.ts";
import { generate } from "../core/generator.ts";
import { render } from "../core/renderer.ts";
import { OutputFormat } from "../types/api_spec.ts";

export class GenerateError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GenerateError";
  }
}

const CONTENT_TYPES: Record<OutputFormat, string> = {
  [OutputFormat.Markdown]: "text/markdown; charset=utf-8",
  [OutputFormat.HTML]: "text/html; charset=utf-8",
  [OutputFormat.JSON]: "application/json; charset=utf-8",
};

export function handleGenerate(req: Request, res: Response): void {
  const format = resolveFormat(req);

  try {
    const body = req.body;
    const spec = parseBody(body, isApiSpec);
    const doc = generate(spec);
    const output = render(doc, format);

    res.status(200).set("Content-Type", CONTENT_TYPES[format]).send(output);
  } catch (e) {
    if (e instanceof ParseError) {
      res.status(400).json({ error: e.message, field: e.field });
      return;
    }
    if (e instanceof GenerateError) {
      res.status(e.status).json({ error: e.message });
      return;
    }
    console.error("Unexpected error in /generate:", e);
    res.status(500).json({ error: "Internal server error" });
  }
}

function resolveFormat(req: Request): OutputFormat {
  const q = req.query.format?.toString().toLowerCase();

  if (q === "html") return OutputFormat.HTML;
  if (q === "json") return OutputFormat.JSON;
  if (q === "markdown") return OutputFormat.Markdown;

  const accept = req.headers.accept ?? "";
  if (accept.includes("text/html")) return OutputFormat.HTML;
  if (accept.includes("application/json")) return OutputFormat.JSON;

  return OutputFormat.Markdown;
}
