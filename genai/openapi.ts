// genai/openapi.ts
//
// High-level API for generating OpenAPI JSON from a natural-language
// description.
//
// Two entry points:
//   - generateEndpoint(client, description)  → single endpoint object
//   - generateDocument(client, description)  → full OpenAPI 3.0.3 doc
//
// Both try `response_format: json_schema` first (strictest) and fall back to
// `json_object` + local validation if the provider rejects the schema.

import { LLMClient, LLMError, type LLMErrorCategory } from "./index.ts";
import type { ChatRequest, ChatResponse, GenerateOpenAPIResult, OpenAPIScope, ResponseFormat } from "./types.ts";
import { endpointSchema, documentSchema, ENDPOINT_SCHEMA_NAME, DOCUMENT_SCHEMA_NAME } from "./schemas/index.ts";

// ── Prompt templates ─────────────────────────────────
const ENDPOINT_SYSTEM_PROMPT = `You are an expert API designer. Given a natural-language description, produce a single OpenAPI endpoint definition as a JSON object.

Requirements:
- Output ONLY a valid JSON object — no prose, no markdown fences, no comments.
- The JSON must conform to the provided JSON Schema (method, path, summary, description, parameters, requestBody, responses, tags).
- Use realistic field names that match RESTful conventions.
- Always include at least a "200" success response and one error response.
- For path parameters, set "required": true and "in": "path".`;

const DOCUMENT_SYSTEM_PROMPT = `You are an expert API architect. Given a natural-language description of a service, produce a complete OpenAPI 3.0.3 document as a JSON object.

Requirements:
- Output ONLY a valid JSON object — no prose, no markdown fences, no comments.
- The JSON must conform to the provided JSON Schema.
- Include "openapi": "3.0.3", "info" (title + version), and a non-empty "paths" object.
- Define at least 2 endpoints, each with summary AND responses (responses is REQUIRED and non-empty).
- Each response entry must have at least a "description" string and a "content" object with "application/json" schema.
- Use realistic RESTful paths (e.g. /users, /users/{id}).
- Example operation shape:
  "get": { "summary": "List users", "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "type": "array" } } } } } }
- You may include "components.schemas" for reusable models if helpful.`;

// ── Public API ───────────────────────────────────────

/**
 * Generate a single OpenAPI endpoint from a natural-language description.
 *
 * Strategy:
 *   1. Try `json_schema` strict mode first.
 *   2. On provider rejection (400), fall back to `json_object` + manual validation.
 */
export async function generateOpenAPIEndpoint(
  client: LLMClient,
  description: string,
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
): Promise<GenerateOpenAPIResult> {
  return generateOpenAPI({
    client,
    description,
    scope: "endpoint",
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    timeoutMs: options.timeoutMs,
  });
}

/**
 * Generate a complete OpenAPI 3.0.3 document from a natural-language description.
 */
export async function generateOpenAPIDocument(
  client: LLMClient,
  description: string,
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
): Promise<GenerateOpenAPIResult> {
  return generateOpenAPI({
    client,
    description,
    scope: "document",
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    timeoutMs: options.timeoutMs,
  });
}

// ── Internal ─────────────────────────────────────────

interface GenerateOpts {
  client: LLMClient;
  description: string;
  scope: OpenAPIScope;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

async function generateOpenAPI(opts: GenerateOpts): Promise<GenerateOpenAPIResult> {
  const { client, description, scope, temperature, maxTokens, timeoutMs } = opts;

  const systemPrompt = scope === "endpoint" ? ENDPOINT_SYSTEM_PROMPT : DOCUMENT_SYSTEM_PROMPT;
  const schemaName = scope === "endpoint" ? ENDPOINT_SCHEMA_NAME : DOCUMENT_SCHEMA_NAME;
  const schema = scope === "endpoint" ? endpointSchema : documentSchema;

  const userPrompt =
    `Description: ${description}\n\n` +
    `Produce the JSON object now — no explanation, no markdown.`;

  // ── Attempt 1: json_schema (strict) ─────────────
  const strictFormat: ResponseFormat = {
    type: "json_schema",
    json_schema: {
      name: schemaName,
      description: `A ${scope === "endpoint" ? "single OpenAPI endpoint" : "complete OpenAPI 3.0.3 document"} definition.`,
      schema: schema as unknown as Record<string, unknown>,
      strict: true,
    },
  };

  const request: ChatRequest = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: temperature ?? 0.2, // low temp for structured output determinism
    maxTokens: maxTokens ?? (scope === "document" ? 4000 : 1000),
    responseFormat: strictFormat,
    timeoutMs,
  };

  try {
    const response = await client.complete(request);
    const parsed = parseAndValidate(response.content, scope);
    return buildResult(parsed, "json_schema", response, scope);
  } catch (err) {
    // If the provider rejected the json_schema (model doesn't support it),
    // fall back to json_object + local validation.
    if (isSchemaUnsupportedError(err)) {
      return generateWithJsonObject(client, request, scope);
    }
    throw err;
  }
}

// ── Fallback: json_object + local validation ─────────

async function generateWithJsonObject(
  client: LLMClient,
  originalReq: ChatRequest,
  scope: OpenAPIScope,
): Promise<GenerateOpenAPIResult> {
  const fallbackReq: ChatRequest = {
    ...originalReq,
    responseFormat: { type: "json_object" },
  };

  const response = await client.complete(fallbackReq);
  const parsed = parseAndValidate(response.content, scope);

  return buildResult(parsed, "json_object", response, scope);
}

// ── Helpers ──────────────────────────────────────────

function parseAndValidate(content: string, scope: OpenAPIScope): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new LLMError(
      `AI returned invalid JSON: ${msg}. Raw content: ${content.slice(0, 200)}`,
      "unknown",
      undefined,
      "openapi-generator",
    );
  }

  // Local validation — check the bare minimum shape.
  if (scope === "endpoint") {
    validateEndpoint(parsed);
  } else {
    validateDocument(parsed);
  }

  return parsed;
}

function validateEndpoint(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new LLMError("Endpoint must be an object", "unknown", undefined, "openapi-generator");
  }
  const v = value as Record<string, unknown>;
  if (typeof v.method !== "string") throw new LLMError("Endpoint.method must be a string", "unknown", undefined, "openapi-generator");
  if (typeof v.path !== "string" || !v.path.startsWith("/")) {
    throw new LLMError("Endpoint.path must be a string starting with '/'", "unknown", undefined, "openapi-generator");
  }
  if (typeof v.summary !== "string" || v.summary.length === 0) {
    throw new LLMError("Endpoint.summary must be a non-empty string", "unknown", undefined, "openapi-generator");
  }
  if (!v.responses || typeof v.responses !== "object") {
    throw new LLMError("Endpoint.responses must be a non-empty object", "unknown", undefined, "openapi-generator");
  }
}

function validateDocument(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new LLMError("Document must be an object", "unknown", undefined, "openapi-generator");
  }
  const v = value as Record<string, unknown>;
  if (v.openapi !== "3.0.3") throw new LLMError("Document.openapi must be '3.0.3'", "unknown", undefined, "openapi-generator");
  if (!v.info || typeof v.info !== "object") {
    throw new LLMError("Document.info must be an object with title and version", "unknown", undefined, "openapi-generator");
  }
  const info = v.info as Record<string, unknown>;
  if (typeof info.title !== "string" || typeof info.version !== "string") {
    throw new LLMError("Document.info.title and version must be strings", "unknown", undefined, "openapi-generator");
  }
  if (!v.paths || typeof v.paths !== "object" || Object.keys(v.paths).length === 0) {
    throw new LLMError("Document.paths must be a non-empty object", "unknown", undefined, "openapi-generator");
  }
}

function buildResult(
  openapi: unknown,
  formatUsed: "json_schema" | "json_object",
  response: ChatResponse,
  scope: OpenAPIScope,
): GenerateOpenAPIResult {
  return {
    openapi,
    scope,
    formatUsed,
    usage: response.usage,
    model: response.model,
  };
}

/**
 * Detect whether an error indicates that the provider rejected the
 * `response_format: json_schema` feature (model not supported, strict mode
 * not available, etc.).
 *
 * Heuristic: status 400 with a message mentioning "response_format" /
 * "json_schema" / "schema" / "unsupported".
 */
function isSchemaUnsupportedError(err: unknown): boolean {
  if (!(err instanceof LLMError)) return false;
  if (err.status !== 400) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("response_format") || msg.includes("json_schema") || msg.includes("schema") || msg.includes("unsupported");
}

// Re-export the schema names for convenience, so callers don't need to
// know about the schemas module.
export { ENDPOINT_SCHEMA_NAME, DOCUMENT_SCHEMA_NAME };
export { endpointSchema, documentSchema } from "./schemas/index.ts";
