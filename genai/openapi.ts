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

import { LLMClient, LLMError } from "./index.ts";
import type {
  ChatRequest,
  ChatResponse,
  GenerateOpenAPIResult,
  OpenAPIScope,
  ResponseFormat,
} from "./types.ts";
import {
  DOCUMENT_SCHEMA_NAME,
  documentSchema,
  ENDPOINT_SCHEMA_NAME,
  endpointSchema,
} from "./schemas/index.ts";

// Prompt templates
const ENDPOINT_SYSTEM_PROMPT =
  `You are an expert API designer. Given a natural-language description, produce a single OpenAPI endpoint definition as a JSON object.

Requirements:
- Output ONLY a valid JSON object — no prose, no markdown fences, no comments.
- The JSON must conform to the provided JSON Schema (method, path, summary, description, parameters, requestBody, responses, tags).
- Use realistic field names that match RESTful conventions.
- Always include at least a "200" success response and one error response.
- For path parameters, set "required": true and "in": "path".

CRITICAL — How to determine the "path" field:
  1. If the user's description EXPLICITLY mentions a URL path (e.g. "/api/v1/auth/login", "/users/{id}"), you MUST use that exact path in the "path" field.
  2. If the user describes the endpoint's purpose but does NOT specify a path, you MUST INFER a RESTful path based on the resource and action (e.g. for "create user" use "/users", for "get user by id" use "/users/{id}", for "login" use "/auth/login" or "/login").
  3. NEVER use "/" as the path — it is almost always wrong. Every endpoint should have a meaningful resource path.
  4. The path MUST start with "/" and use lowercase, hyphenated or RESTful conventions.

Example:
  User says: "User login endpoint, path is /api/v1/auth/login, accepts phone and verification code, returns JWT token"
  You output: { "method": "POST", "path": "/api/v1/auth/login", ... }

  User says: "Get user details by ID"
  You output: { "method": "GET", "path": "/users/{id}", ... }

  User says: "Create order endpoint"
  You output: { "method": "POST", "path": "/orders", ... }`;

const DOCUMENT_SYSTEM_PROMPT =
  `You are an expert API architect. Given a natural-language description of a service, produce a complete OpenAPI 3.0.3 document as a JSON object.

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

// Public API

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
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } =
    {},
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
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } =
    {},
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

// Internal

interface GenerateOpts {
  client: LLMClient;
  description: string;
  scope: OpenAPIScope;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

async function generateOpenAPI(
  opts: GenerateOpts,
): Promise<GenerateOpenAPIResult> {
  const { client, description, scope, temperature, maxTokens, timeoutMs } =
    opts;

  const systemPrompt = scope === "endpoint"
    ? ENDPOINT_SYSTEM_PROMPT
    : DOCUMENT_SYSTEM_PROMPT;
  const schemaName = scope === "endpoint"
    ? ENDPOINT_SCHEMA_NAME
    : DOCUMENT_SCHEMA_NAME;
  const schema = scope === "endpoint" ? endpointSchema : documentSchema;

  // Try to extract a path from the description so we can force-feed it to the AI.
  const extractedPath = extractPathFromDescription(description);

  let pathDirective = "";
  if (extractedPath) {
    pathDirective =
      `\n\n⚠️ CRITICAL INSTRUCTION: The URL path for this endpoint is "${extractedPath}". ` +
      `You MUST use "${extractedPath}" as the value of the "path" field in your JSON output. ` +
      `Do NOT change it, do NOT use "/", do NOT invent a different path. Copy "${extractedPath}" exactly.`;
  } else {
    pathDirective =
      `\n\n⚠️ CRITICAL INSTRUCTION: You must INFER a RESTful URL path from the description. ` +
      `Never use "/" as the path. Examples: "create user" → "/users", "get user by id" → "/users/{id}", "login" → "/auth/login".`;
  }

  const userPrompt = `Description: ${description}\n\n` +
    `Produce the JSON object now — no explanation, no markdown.${pathDirective}`;

  // Attempt 1: json_schema (strict)
  const strictFormat: ResponseFormat = {
    type: "json_schema",
    json_schema: {
      name: schemaName,
      description: `A ${
        scope === "endpoint"
          ? "single OpenAPI endpoint"
          : "complete OpenAPI 3.0.3 document"
      } definition.`,
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
    const parsed = parseAndValidate(response.content, scope, extractedPath);
    return buildResult(parsed, "json_schema", response, scope);
  } catch (err) {
    // If the provider rejected the json_schema (model doesn't support it),
    // fall back to json_object + local validation.
    if (isSchemaUnsupportedError(err)) {
      return generateWithJsonObject(client, request, scope, extractedPath);
    }
    throw err;
  }
}

// Fallback: json_object + local validation

async function generateWithJsonObject(
  client: LLMClient,
  originalReq: ChatRequest,
  scope: OpenAPIScope,
  extractedPath: string | null = null,
): Promise<GenerateOpenAPIResult> {
  const fallbackReq: ChatRequest = {
    ...originalReq,
    responseFormat: { type: "json_object" },
  };

  const response = await client.complete(fallbackReq);
  const parsed = parseAndValidate(response.content, scope, extractedPath);

  return buildResult(parsed, "json_object", response, scope);
}

// Helpers

function parseAndValidate(
  content: string,
  scope: OpenAPIScope,
  extractedPath: string | null = null,
): unknown {
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

  // Post-process: fix the path BEFORE validation, so we don't reject valid
  // AI output just because the provider didn't enforce minLength.
  parsed = fixPathIfNeeded(parsed, extractedPath, scope);

  // Local validation — check the bare minimum shape.
  try {
    if (scope === "endpoint") {
      validateEndpoint(parsed);
    } else {
      validateDocument(parsed);
    }
  } catch (err) {
    const rawSnippet = typeof content === "string"
      ? content.slice(0, 500)
      : JSON.stringify(parsed).slice(0, 500);
    const originalMsg = err instanceof Error ? err.message : String(err);
    throw new LLMError(
      `${originalMsg}. Raw AI output: ${rawSnippet}`,
      "unknown",
      undefined,
      "openapi-generator",
    );
  }

  return parsed;
}

function validateEndpoint(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new LLMError(
      "Endpoint must be an object",
      "unknown",
      undefined,
      "openapi-generator",
    );
  }
  const v = value as Record<string, unknown>;
  if (typeof v.method !== "string") {
    throw new LLMError(
      "Endpoint.method must be a string",
      "unknown",
      undefined,
      "openapi-generator",
    );
  }
  if (
    typeof v.path !== "string" || v.path.length < 2 || !v.path.startsWith("/")
  ) {
    throw new LLMError(
      `Endpoint.path must be a non-trivial string starting with '/' (e.g. '/users/{id}'), got: ${
        JSON.stringify(v.path)
      }`,
      "unknown",
      undefined,
      "openapi-generator",
    );
  }
  if (typeof v.summary !== "string" || v.summary.length === 0) {
    throw new LLMError(
      "Endpoint.summary must be a non-empty string",
      "unknown",
      undefined,
      "openapi-generator",
    );
  }
  if (!v.responses || typeof v.responses !== "object") {
    throw new LLMError(
      "Endpoint.responses must be a non-empty object",
      "unknown",
      undefined,
      "openapi-generator",
    );
  }
}

function validateDocument(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new LLMError(
      "Document must be an object",
      "unknown",
      undefined,
      "openapi-generator",
    );
  }
  const v = value as Record<string, unknown>;
  if (v.openapi !== "3.0.3") {
    throw new LLMError(
      "Document.openapi must be '3.0.3'",
      "unknown",
      undefined,
      "openapi-generator",
    );
  }
  if (!v.info || typeof v.info !== "object") {
    throw new LLMError(
      "Document.info must be an object with title and version",
      "unknown",
      undefined,
      "openapi-generator",
    );
  }
  const info = v.info as Record<string, unknown>;
  if (typeof info.title !== "string" || typeof info.version !== "string") {
    throw new LLMError(
      "Document.info.title and version must be strings",
      "unknown",
      undefined,
      "openapi-generator",
    );
  }
  if (
    !v.paths || typeof v.paths !== "object" || Object.keys(v.paths).length === 0
  ) {
    throw new LLMError(
      "Document.paths must be a non-empty object",
      "unknown",
      undefined,
      "openapi-generator",
    );
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
  return msg.includes("response_format") || msg.includes("json_schema") ||
    msg.includes("schema") || msg.includes("unsupported");
}

// Path extraction & post-processing

/**
 * Extract a URL path from a natural-language description.
 * Matches patterns like:
 *   - "/api/v1/auth/login"
 *   - "/users/{id}"
 *   - "/login"
 *   - "path is /api/v1/auth/login"
 *   - "path is /users"
 */
function extractPathFromDescription(description: string): string | null {
  // Match a slash followed by word chars, slashes, hyphens, underscores, and curly-braced params.
  const pathRegex = /\/(?:[a-zA-Z0-9_\-{}\/]+)/g;
  const matches = description.match(pathRegex);
  if (!matches) return null;

  // Return the longest match (most specific path), filtering out trivial ones like "/".
  const valid = matches.filter((m) => m.length >= 2 && m !== "/");
  if (valid.length === 0) return null;

  // Prefer paths that look like API paths (contain multiple segments or params).
  valid.sort((a, b) => b.length - a.length);
  return valid[0];
}

/**
 * If the AI returned an invalid path but we extracted a path from the description,
 * override the AI's path with the extracted one.
 */
function fixPathIfNeeded(
  parsed: unknown,
  extractedPath: string | null,
  scope: OpenAPIScope,
): unknown {
  if (scope !== "endpoint") return parsed;

  const obj = parsed as Record<string, unknown>;
  const currentPath = typeof obj.path === "string" ? obj.path : "";

  // If the AI's path is invalid (too short, just "/", or missing), use the extracted one.
  if (
    currentPath.length < 2 || currentPath === "/" ||
    !currentPath.startsWith("/")
  ) {
    if (extractedPath) {
      obj.path = extractedPath;
    } else {
      // Fallback: infer a path from the summary or use a generic one.
      const summary = typeof obj.summary === "string" ? obj.summary : "";
      obj.path = inferPathFromSummary(summary);
    }
  }

  // If responses is empty, add a default 200 success response.
  if (
    !obj.responses || typeof obj.responses !== "object" ||
    Object.keys(obj.responses as object).length === 0
  ) {
    obj.responses = {
      "200": {
        description: "Successful operation",
        content: {
          "application/json": {
            schema: { type: "object" },
          },
        },
      },
    };
  }

  return obj;
}

/**
 * Infer a RESTful path from a summary string when no path is explicitly given.
 * Example: "Create user" → "/users", "Get user by id" → "/users/{id}"
 */
function inferPathFromSummary(summary: string): string {
  const s = summary.toLowerCase();
  // Check for "by id" / "detail" patterns → use path param
  if (s.includes("by id") || s.includes("detail")) {
    return "/resource/{id}";
  }
  // Generic fallback: use pluralized form based on English keywords.
  if (s.includes("user")) return "/users";
  if (s.includes("login") || s.includes("auth")) return "/auth/login";
  if (s.includes("order")) return "/orders";
  if (s.includes("product")) return "/products";
  return "/resource";
}

// Re-export the schema names for convenience, so callers don't need to
// know about the schemas module.
export { DOCUMENT_SCHEMA_NAME, ENDPOINT_SCHEMA_NAME };
export { documentSchema, endpointSchema } from "./schemas/index.ts";

// Streaming support

/** A single event emitted while streaming an OpenAPI generation. */
export type OpenAPIStreamEvent =
  | { type: "delta"; content: string }
  | { type: "done"; result: GenerateOpenAPIResult }
  | { type: "error"; message: string; category?: string };

/**
 * Stream an OpenAPI endpoint generation.
 *
 * Returns a ReadableStream of OpenAPIStreamEvent. The backend SSE handler
 * pipes these events directly to the client.
 */
export async function generateOpenAPIEndpointStream(
  client: LLMClient,
  description: string,
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } =
    {},
): Promise<ReadableStream<OpenAPIStreamEvent>> {
  return generateOpenAPIStream({
    client,
    description,
    scope: "endpoint",
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    timeoutMs: options.timeoutMs,
  });
}

/**
 * Stream a complete OpenAPI document generation.
 */
export async function generateOpenAPIDocumentStream(
  client: LLMClient,
  description: string,
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } =
    {},
): Promise<ReadableStream<OpenAPIStreamEvent>> {
  return generateOpenAPIStream({
    client,
    description,
    scope: "document",
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    timeoutMs: options.timeoutMs,
  });
}

// Internal: shared streaming implementation
async function generateOpenAPIStream(
  opts: GenerateOpts,
): Promise<ReadableStream<OpenAPIStreamEvent>> {
  const { client, description, scope, temperature, maxTokens, timeoutMs } =
    opts;

  const systemPrompt = scope === "endpoint"
    ? ENDPOINT_SYSTEM_PROMPT
    : DOCUMENT_SYSTEM_PROMPT;
  const extractedPath = extractPathFromDescription(description);

  let pathDirective = "";
  if (extractedPath) {
    pathDirective =
      `\n\nCRITICAL: The URL path is "${extractedPath}". Use it exactly.`;
  }

  const userPrompt =
    `Description: ${description}\n\nProduce JSON now — no explanation.${pathDirective}`;

  // Use json_object for streaming (json_schema + stream not universally supported).
  const request: ChatRequest = {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: temperature ?? 0.2,
    maxTokens: maxTokens ?? (scope === "document" ? 4000 : 1000),
    responseFormat: { type: "json_object" },
    timeoutMs,
  };

  let accumulated = "";

  return new ReadableStream<OpenAPIStreamEvent>({
    async start(controller) {
      try {
        const stream = await client.streamComplete(request);
        const reader = stream.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += value;
          controller.enqueue({ type: "delta", content: value });
        }

        // Stream finished — parse and validate the full accumulated text.
        const parsed = parseAndValidate(accumulated, scope, extractedPath);
        const result: GenerateOpenAPIResult = {
          openapi: parsed,
          scope,
          formatUsed: "json_object",
          usage: { promptTokens: 0, completionTokens: 0 }, // usage unavailable in stream
          model: "",
        };
        controller.enqueue({ type: "done", result });
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const category = err instanceof LLMError ? err.category : undefined;
        controller.enqueue({ type: "error", message, category });
        controller.close();
      }
    },
  });
}
