// genai/types.ts — Unified type definitions for the genai module.
// These types abstract over concrete LLM providers so the rest of the
// codebase only depends on this interface, not any specific backend.

// ── Chat message ────────────────────────────────────
export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

// ── Request / Response ──────────────────────────────
export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** Request timeout in milliseconds. Default: 30_000 (set by provider). */
  timeoutMs?: number;
  /** Reserved — phase 3 will enable streaming replies. */
  stream?: boolean;
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

// ── Provider interface ──────────────────────────────
// Each LLM backend (Agnes, OpenAI, DeepSeek, Ollama, …) implements this.
// The LLMClient only depends on this abstraction.
export interface Provider {
  chat(req: ChatRequest): Promise<ChatResponse>;
}
