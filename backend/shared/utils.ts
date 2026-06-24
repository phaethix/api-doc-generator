// shared/utils.ts — Cross-module utility functions, eliminate duplicate code.

import { OutputFormat } from "../types/api_spec.ts";
import { ParseError } from "../core/parser.ts";
import { GenerateError } from "../handlers/generate.ts";

// API path detection
/**
 * Determine if a path is an API endpoint.
 * API endpoints are: /health, /generate, /import/*
 */
export function isApiPath(pathname: string): boolean {
  return pathname === "/health" ||
         pathname.startsWith("/generate") ||
         pathname.startsWith("/import/") ||
         pathname === "/import" ||
         pathname.startsWith("/api/");
}

// Content-Type mapping
export const CONTENT_TYPES: Record<OutputFormat, string> = {
  [OutputFormat.Markdown]: "text/markdown; charset=utf-8",
  [OutputFormat.HTML]:     "text/html; charset=utf-8",
  [OutputFormat.JSON]:     "application/json; charset=utf-8",
};

// Format parsing: query param → Accept header → default
export function resolveFormat(req: Request): OutputFormat {
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

// CORS headers
const CORS_ORIGINS = Deno.env.get("CORS_ALLOWED_ORIGINS") ?? "*";

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": CORS_ORIGINS,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  };
}

// Request body size limit (5MB)
const MAX_BODY_SIZE = 5 * 1024 * 1024;

/**
 * Read request body with size limit. Throws ParseError if body is too large.
 */
export async function readBody(req: Request): Promise<unknown> {
  const contentLength = parseInt(req.headers.get("Content-Length") ?? "0", 10);
  if (contentLength > MAX_BODY_SIZE) {
    throw new ParseError("Request body too large (max 5MB)", "body");
  }

  const buffer = await req.arrayBuffer();
  if (buffer.byteLength > MAX_BODY_SIZE) {
    throw new ParseError("Request body too large (max 5MB)", "body");
  }

  try {
    return JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    throw new ParseError("Invalid JSON body", "body");
  }
}

// Unified error handling
export function handleApiError(e: unknown, routeName: string): Response {
  if (e instanceof ParseError) {
    return new Response(
      JSON.stringify({ error: e.message, field: e.field }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(),
        },
      },
    );
  }
  if (e instanceof GenerateError) {
    return new Response(
      JSON.stringify({ error: e.message }),
      {
        status: e.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(),
        },
      },
    );
  }
  console.error(`Unexpected error in ${routeName}:`, e);
  return new Response(
    JSON.stringify({ error: "Internal server error" }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(),
      },
    },
  );
}

// OPTIONS (CORS preflight) response
export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
