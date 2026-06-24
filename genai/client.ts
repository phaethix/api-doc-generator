// LLMClient — the main entry point for LLM calls.
// The client depends only on the Provider abstraction, so callers never
// need to know which backend is being used.

import type { ChatRequest, ChatResponse, Provider } from "./types.ts";

export class LLMClient {
  constructor(private provider: Provider) {}

  // Single public method. Future streaming support will add `stream()`
  // without changing this signature.
  async complete(req: ChatRequest): Promise<ChatResponse> {
    return await this.provider.chat(req);
  }
}
