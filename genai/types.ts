// genai/types.ts — Unified type definitions for the genai module.
// These types abstract over concrete LLM providers so the rest of the
// codebase only depends on this interface, not any specific backend.

// Chat message
export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// Response format (structured output)
// Phase 2: restrict model output to valid JSON shapes.
//
//   "text"                  — default, free-form
//   "json_object"           — provider guarantees a parseable JSON object
//   "json_schema"           — provider guarantees the output validates
//                             against the supplied JSON Schema (strictest)
export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        description?: string;
        schema: Record<string, unknown>;
        strict?: boolean;
      };
    };

// Request / Response
export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Request timeout in milliseconds. Default: 30_000 (set by provider). */
  timeoutMs?: number;
  /** Reserved — phase 3 will enable streaming replies. */
  stream?: boolean;
  /** Phase 2: request a specific structured output format. */
  responseFormat?: ResponseFormat;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
}

export interface ChatResponse {
  content: string;
  usage: Usage;
  model: string;
  /** Phase 2: the actual response_format the provider honored. */
  formatUsed?: ResponseFormat["type"];
}

// Provider interface
// Each LLM backend (Agnes, OpenAI, DeepSeek, Ollama, …) implements this.
// The LLMClient only depends on this abstraction.
export interface Provider {
  chat(req: ChatRequest): Promise<ChatResponse>;
}

// OpenAPI generator output
// Phase 2: returned by the high-level generator so callers know
// exactly what shape of OpenAPI JSON they received.
export type OpenAPIScope = "endpoint" | "document";

export interface GenerateOpenAPIResult {
  /** The generated OpenAPI JSON, already validated. */
  openapi: unknown;
  /** Whether "endpoint" (single path) or "document" (full spec) was produced. */
  scope: OpenAPIScope;
  /** The response_format the provider actually used. Useful for debugging. */
  formatUsed: ResponseFormat["type"];
  /** Token usage for cost tracking. */
  usage: Usage;
  model: string;
}
