// genai/client.ts — LLMClient: the main entry point for LLM calls.
//
// The client depends only on the Provider abstraction, so callers never
// need to know which backend is being used. This also makes the client
// trivially testable with mock providers.

import type { ChatRequest, ChatResponse, Provider } from "./types.ts";

export class LLMClient {
  constructor(private provider: Provider) {}

  /**
   * Send a chat completion request and return the response.
   *
   * Validates the request before delegating to the provider, so we never
   * waste an API call on an obviously malformed request.
   */
  async complete(req: ChatRequest): Promise<ChatResponse> {
    this.validate(req);
    return await this.provider.chat(req);
  }

  // ── Request validation ────────────────────────────
  private validate(req: ChatRequest): void {
    if (!req.messages || req.messages.length === 0) {
      throw new Error("LLMClient.complete: at least one message is required");
    }
    if (req.temperature !== undefined && (req.temperature < 0 || req.temperature > 2)) {
      throw new Error("LLMClient.complete: temperature must be between 0 and 2");
    }
    if (req.maxTokens !== undefined && req.maxTokens <= 0) {
      throw new Error("LLMClient.complete: maxTokens must be positive");
    }
  }
}
