// Public API for the genai module.
// Consumers (backend handlers, future frontend) import only from this file.

import { LLMClient } from "./client.ts";
import { OpenAIProvider, LLMError } from "./providers/openai.ts";
import type { Provider } from "./types.ts";

export { LLMClient, OpenAIProvider, LLMError };
export type * from "./types.ts";

// Factory: reads configuration from environment variables and produces
// a configured LLMClient. Centralizing this keeps each handler simple.
export function createLLMClient(): LLMClient {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY environment variable is required. " +
        "Copy config/env.example to .env and set your key.",
    );
  }

  const baseUrl =
    Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1";
  const model = Deno.env.get("LLM_MODEL") ?? "agnes";

  const provider: Provider = new OpenAIProvider(apiKey, baseUrl, model);
  return new LLMClient(provider);
}
