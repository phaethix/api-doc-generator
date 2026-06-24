// Unified type definitions for the genai module.
// These types abstract over concrete LLM providers (OpenAI, Anthropic, etc.)
// so the rest of the codebase only depends on this interface.

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean; // Reserved for phase 3 (Streaming)
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
}

export interface ChatResponse {
  content: string;
  usage: Usage;
  model: string;
}

// Provider interface — each LLM backend (OpenAI, Anthropic, Google, Ollama)
// implements this interface. The LLMClient only depends on this abstraction.
export interface Provider {
  chat(req: ChatRequest): Promise<ChatResponse>;
}
