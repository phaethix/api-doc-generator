// genai/providers/chat_completions.ts
//
// Provider for any service that exposes an OpenAI-compatible
// /v1/chat/completions endpoint. This covers:
//   - Agnes AI (https://apihub.agnes-ai.com/v1)
//   - OpenAI  (https://api.openai.com/v1)
//   - DeepSeek, Qwen, Moonshot, local Ollama, …
//
// Switching providers = changing baseUrl + model, no code changes.

import type { ChatRequest, ChatResponse, Provider } from "../types.ts";
import { LLMError, type LLMErrorCategory } from "../errors.ts";

// ── Options ─────────────────────────────────────────
export interface ChatCompletionsOptions {
  /** Maximum time to wait for a response, in milliseconds. Default: 30_000. */
  timeoutMs?: number;
}

// ── Provider ────────────────────────────────────────
export class ChatCompletionsProvider implements Provider {
  readonly name = "chat-completions";

  constructor(
    private apiKey: string,
    private baseUrl: string = "https://api.openai.com/v1",
    private model: string = "gpt-4o-mini",
    private options: ChatCompletionsOptions = {},
  ) {}

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    const timeoutMs = req.timeoutMs ?? this.options.timeoutMs ?? 30_000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: req.messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens,
          stream: req.stream ?? false,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw this.toLLMError(resp.status, resp.statusText);
      }

      const data = await resp.json();

      // Defensive parsing: providers may return slightly different shapes.
      const content = data.choices?.[0]?.message?.content ?? "";
      const usage = {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      };

      return {
        content,
        usage,
        model: data.model ?? this.model,
      };
    } catch (err) {
      // Re-throw LLMError as-is (already categorized).
      if (err instanceof LLMError) throw err;

      // Timeout → network error.
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new LLMError(
          `Request timed out after ${timeoutMs}ms`,
          "network",
          undefined,
          this.name,
        );
      }

      // Anything else (DNS, connection refused, …) is a network error.
      const message = err instanceof Error ? err.message : String(err);
      throw new LLMError(
        `Network error: ${message}`,
        "network",
        undefined,
        this.name,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Internals ─────────────────────────────────────
  private toLLMError(status: number, statusText: string): LLMError {
    const category = categorizeStatus(status);
    const message = formatErrorMessage(category, status, statusText);
    return new LLMError(message, category, status, this.name);
  }
}

// Map an HTTP status to an LLMErrorCategory.
function categorizeStatus(status: number): LLMErrorCategory {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server";
  return "unknown";
}

// Produce a user-friendly message per category.
function formatErrorMessage(
  category: LLMErrorCategory,
  status: number,
  statusText: string,
): string {
  switch (category) {
    case "auth":
      return "Authentication failed: check your API key.";
    case "rate_limit":
      return "Rate limit exceeded: please retry later.";
    case "server":
      return `Provider returned server error: ${status} ${statusText}.`;
    default:
      return `Provider returned ${status} ${statusText}.`;
  }
}
