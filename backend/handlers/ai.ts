// AI handler — exposes /ai/ping endpoint for verifying the LLMClient works.
// This is phase 1: a minimal "ping" that asks the LLM to reply with "pong".

import { createLLMClient } from "../../genai/index.ts";

export async function handleAIPing(_req: Request): Promise<Response> {
  try {
    const client = createLLMClient();
    const res = await client.complete({
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant. Reply concisely.",
        },
        {
          role: "user",
          content: "Reply with exactly the single word: pong",
        },
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
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
