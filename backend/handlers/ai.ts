// handlers/ai.ts — AI endpoints.
//
// Phase 1 exposes a single /ai/ping endpoint that verifies the LLMClient
// is wired up correctly. Future phases will add /ai/enhance, /ai/chat, etc.

import { createLLMClient, LLMError, type LLMErrorCategory } from "../../genai/index.ts";

// Map LLMError categories to HTTP status codes.
// This keeps the handler thin — error semantics live in the genai module.
const STATUS_BY_CATEGORY: Record<LLMErrorCategory, number> = {
  auth: 401,
  rate_limit: 429,
  server: 502,
  network: 503,
  unknown: 500,
};

export async function handleAIPing(_req: Request): Promise<Response> {
  try {
    const client = createLLMClient();
    const res = await client.complete({
      messages: [
        { role: "system", content: "You are a helpful assistant. Reply concisely." },
        { role: "user", content: "Reply with exactly the single word: pong" },
      ],
      temperature: 0,
      maxTokens: 10,
    });

    return Response.json({
      ok: true,
      reply: res.content,
      usage: res.usage,
      model: res.model,
    });
  } catch (err) {
    if (err instanceof LLMError) {
      const status = STATUS_BY_CATEGORY[err.category] ?? 500;
      return Response.json(
        { ok: false, error: err.message, category: err.category },
        { status },
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
