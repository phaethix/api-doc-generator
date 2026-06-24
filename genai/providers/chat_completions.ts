// genai/providers/chat_completions.ts
//
// Provider for any service that exposes an OpenAI-compatible
// /v1/chat/completions endpoint. This covers:
//   - Agnes AI (https://apihub.agnes-ai.com/v1)
//   - OpenAI  (https://api.openai.com/v1)
//   - DeepSeek, Qwen, Moonshot, local Ollama, …

import type { ChatRequest, ChatResponse, Provider } from "../types.ts";
import { LLMError, type LLMErrorCategory } from "../errors.ts";

// Options
export interface ChatCompletionsOptions {
  /** Maximum time to wait for a response, in milliseconds. Default: 30_000. */
  timeoutMs?: number;
}

// Provider
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

    const body: Record<string, unknown> = {
      model: this.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens,
      stream: req.stream ?? false,
    };
    if (req.responseFormat && req.responseFormat.type !== "text") {
      body.response_format = req.responseFormat.type === "json_schema"
        ? { type: "json_schema", json_schema: req.responseFormat.json_schema }
        : { type: "json_object" };
    }

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errorBody = await safeReadText(resp);
        throw this.toLLMError(resp.status, resp.statusText, errorBody);
      }

      const data = await resp.json();

      const content = data.choices?.[0]?.message?.content ?? "";
      const usage = {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      };

      const formatUsed: ChatResponse["formatUsed"] = req.responseFormat?.type ??
        "text";

      return {
        content,
        usage,
        model: data.model ?? this.model,
        formatUsed,
      };
    } catch (err) {
      if (err instanceof LLMError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new LLMError(
          `Request timed out after ${timeoutMs}ms`,
          "network",
          undefined,
          this.name,
        );
      }
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

  async streamChat(req: ChatRequest): Promise<ReadableStream<string>> {
    const url = `${this.baseUrl}/chat/completions`;
    const timeoutMs = req.timeoutMs ?? this.options.timeoutMs ?? 30_000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const body: Record<string, unknown> = {
      model: this.model,
      messages: req.messages,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens,
      stream: true,
    };
    if (req.responseFormat && req.responseFormat.type !== "text") {
      body.response_format = req.responseFormat.type === "json_schema"
        ? { type: "json_schema", json_schema: req.responseFormat.json_schema }
        : { type: "json_object" };
    }

    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const errorBody = await safeReadText(resp);
        throw this.toLLMError(resp.status, resp.statusText, errorBody);
      }

      const sseStream = resp.body;
      if (!sseStream) {
        throw new LLMError(
          "Provider did not return a stream",
          "unknown",
          undefined,
          this.name,
        );
      }

      return parseSSEStream(sseStream, this.name);
    } catch (err) {
      if (err instanceof LLMError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new LLMError(
          `Request timed out after ${timeoutMs}ms`,
          "network",
          undefined,
          this.name,
        );
      }
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

  // Internals
  private toLLMError(
    status: number,
    statusText: string,
    body?: string,
  ): LLMError {
    const category = categorizeStatus(status);
    const message = formatErrorMessage(category, status, statusText, body);
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
  body?: string,
): string {
  const base = (() => {
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
  })();

  if (body) {
    const snippet = body.length > 300 ? body.slice(0, 300) + "…" : body;
    return `${base} Provider says: ${snippet}`;
  }
  return base;
}

// Read response body as text, tolerating cases where it's already consumed
// or not decodable. Never throws.
async function safeReadText(resp: Response): Promise<string> {
  try {
    return await resp.text();
  } catch {
    return "";
  }
}

/**
 * Parse an SSE (Server-Sent Events) stream from an OpenAI-compatible provider
 * and return a ReadableStream<string> of text deltas.
 *
 * SSE format:
 *   data: {"choices":[{"delta":{"content":"hello"}}]}
 *   data: [DONE]
 */
function parseSSEStream(
  stream: ReadableStream<Uint8Array>,
  providerName: string,
): ReadableStream<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<string>({
    async pull(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Flush any remaining buffer content
            const remaining = buffer.trim();
            if (remaining.startsWith("data:")) {
              const data = remaining.slice(5).trim();
              if (data !== "[DONE]") {
                try {
                  const parsed = JSON.parse(data);
                  const delta = parsed.choices?.[0]?.delta?.content;
                  if (delta) controller.enqueue(delta);
                } catch {
                  // ignore unparseable chunks
                }
              }
            }
            controller.close();
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const data = trimmed.slice(5).trim();
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(delta);
            } catch {
              // Not a JSON chunk or no content delta — skip
            }
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.error(
          new LLMError(
            `SSE stream error: ${message}`,
            "unknown",
            undefined,
            providerName,
          ),
        );
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
