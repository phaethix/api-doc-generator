// OpenAI-compatible provider implementation.
// Most cloud LLMs (OpenAI, Anthropic via proxy, Google Gemini, DeepSeek,
// Qwen, Ollama) expose an OpenAI-compatible /v1/chat/completions endpoint,
// so a single implementation covers most providers via the base URL setting.

import type { ChatRequest, ChatResponse, Provider } from "../types.ts";

export class LLMError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "LLMError";
  }
}

export class OpenAIProvider implements Provider {
  constructor(
    private apiKey: string,
    private baseUrl = "https://api.openai.com/v1",
    private model = "gpt-4o-mini",
  ) {}

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const url = `${this.baseUrl}/chat/completions`;
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
    });

    if (!resp.ok) {
      throw new LLMError(
        `OpenAI API error: ${resp.status} ${resp.statusText}`,
        resp.status,
      );
    }

    const data = await resp.json();

    // Defensive parsing: OpenAI response shape may vary across providers
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
  }
}
