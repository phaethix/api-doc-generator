// genai/index.ts — Public API for the genai module.
//
// Consumers (backend handlers, future frontend, scripts) import only from
// this file. Internal modules (providers, errors) are implementation
// details and should not be imported directly.

import { LLMClient } from "./client.ts";
import { ChatCompletionsProvider } from "./providers/chat_completions.ts";
import { LLMConfigError, LLMError } from "./errors.ts";
import type { LLMErrorCategory } from "./errors.ts";
import type { ChatCompletionsOptions } from "./providers/chat_completions.ts";
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatRole,
  GenerateOpenAPIResult,
  OpenAPIScope,
  Provider,
  ResponseFormat,
  Usage,
} from "./types.ts";

// Errors
export { LLMConfigError, LLMError };
export type { LLMErrorCategory };

// Types
export type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  ChatRole,
  GenerateOpenAPIResult,
  OpenAPIScope,
  Provider,
  ResponseFormat,
  Usage,
};

// Client
export { LLMClient };

// Providers
export { ChatCompletionsProvider };
export type { ChatCompletionsOptions };

// Phase 2: Structured output (OpenAPI generation)
export {
  DOCUMENT_SCHEMA_NAME,
  documentSchema,
  ENDPOINT_SCHEMA_NAME,
  endpointSchema,
  generateOpenAPIDocument,
  generateOpenAPIDocumentStream,
  generateOpenAPIEndpoint,
  generateOpenAPIEndpointStream,
  type OpenAPIStreamEvent,
} from "./openapi.ts";
export {
  documentSchema as documentJSONSchema,
  endpointSchema as endpointJSONSchema,
} from "./schemas/index.ts";

// Factory
export interface LLMClientConfig {
  /** API key for the provider. Required unless present in env. */
  apiKey: string;
  /** OpenAI-compatible base URL. Defaults to Agnes AI. */
  baseUrl?: string;
  /** Model identifier. Defaults to "agnes-2.0-flash". */
  model?: string;
  /** Per-request timeout in milliseconds. Default: 30_000. */
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = "https://apihub.agnes-ai.com/v1";
const DEFAULT_MODEL = "agnes-2.0-flash";
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Create an LLMClient.
 *
 * Usage patterns:
 *   // 1. Auto from environment (production)
 *   const client = createLLMClient();
 *
 *   // 2. Explicit config (tests, scripts)
 *   const client = createLLMClient({ apiKey: "...", model: "agnes-2.0-flash" });
 *
 *   // 3. Override a single value from env
 *   const client = createLLMClient({ timeoutMs: 60_000 });
 *
 * Falls back to environment variables for any unset field:
 *   - OPENAI_API_KEY   (required)
 *   - OPENAI_BASE_URL  (default: Agnes AI)
 *   - LLM_MODEL        (default: agnes-2.0-flash)
 */
export function createLLMClient(config?: Partial<LLMClientConfig>): LLMClient {
  const apiKey = config?.apiKey ?? Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new LLMConfigError(
      "OPENAI_API_KEY is required. " +
        "Set it in .env (copy config/env.example) or pass config.apiKey explicitly.",
    );
  }

  const baseUrl = config?.baseUrl ?? Deno.env.get("OPENAI_BASE_URL") ??
    DEFAULT_BASE_URL;
  const model = config?.model ?? Deno.env.get("LLM_MODEL") ?? DEFAULT_MODEL;
  const timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const provider = new ChatCompletionsProvider(apiKey, baseUrl, model, {
    timeoutMs,
  });
  return new LLMClient(provider);
}
