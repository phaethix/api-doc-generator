// genai/tests/client_test.ts — Unit tests for LLMClient and friends.
//
// These tests use mock providers and a fetch shim (no real API calls,
// no tokens burned) to verify the client's forwarding logic, validation,
// error categorization, and timeout behavior.

import { LLMClient, createLLMClient, LLMError, LLMConfigError } from "../index.ts";
import {
  ChatCompletionsProvider,
} from "../providers/chat_completions.ts";
import type { ChatRequest, ChatResponse, Provider } from "../types.ts";
import { assertEquals, assertRejects } from "@std/assert";

// ── Mock helpers ───────────────────────────────────
class MockProvider implements Provider {
  constructor(
    private response: string,
    private model = "mock-model",
  ) {}

  async chat(req: ChatRequest): Promise<ChatResponse> {
    return {
      content: this.response,
      usage: { promptTokens: 10, completionTokens: 5 },
      model: this.model,
    };
  }
}

function createCapture() {
  const capture: { req: ChatRequest | null } = { req: null };
  class CaptureProvider implements Provider {
    async chat(req: ChatRequest): Promise<ChatResponse> {
      capture.req = req;
      return {
        content: "ok",
        usage: { promptTokens: 1, completionTokens: 1 },
        model: "capture",
      };
    }
  }
  return { provider: new CaptureProvider(), capture };
}

// ── Fetch shim helper ──────────────────────────────
// Temporarily replace globalThis.fetch to return canned responses.
function withMockFetch<T>(mock: () => Response | Promise<Response>, fn: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (() => mock()) as typeof fetch;
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

// Build a successful OpenAI-shaped response.
function okResponse(content = "hello", model = "test-model") {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-test",
      model,
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// ── LLMClient forwarding ───────────────────────────

Deno.test("LLMClient.complete forwards messages and returns provider content", async () => {
  const client = new LLMClient(new MockProvider("hello from mock"));
  const res = await client.complete({
    messages: [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "hi" },
    ],
  });
  assertEquals(res.content, "hello from mock");
  assertEquals(res.model, "mock-model");
  assertEquals(res.usage.promptTokens, 10);
  assertEquals(res.usage.completionTokens, 5);
});

Deno.test("LLMClient passes through temperature and maxTokens to provider", async () => {
  const { provider, capture } = createCapture();
  const client = new LLMClient(provider);
  await client.complete({
    messages: [{ role: "user", content: "test" }],
    temperature: 0.5,
    maxTokens: 100,
  });

  if (!capture.req) throw new Error("CaptureProvider.chat was not called");
  assertEquals(capture.req.temperature, 0.5);
  assertEquals(capture.req.maxTokens, 100);
  assertEquals(capture.req.messages.length, 1);
});

// ── LLMClient validation ───────────────────────────

Deno.test("LLMClient rejects empty messages", async () => {
  const client = new LLMClient(new MockProvider("should not be called"));
  await assertRejects(
    () => client.complete({ messages: [] }),
    Error,
    "at least one message",
  );
});

Deno.test("LLMClient rejects out-of-range temperature", async () => {
  const client = new LLMClient(new MockProvider("x"));
  await assertRejects(
    () => client.complete({
      messages: [{ role: "user", content: "hi" }],
      temperature: 3,
    }),
    Error,
    "temperature must be between 0 and 2",
  );
});

Deno.test("LLMClient rejects non-positive maxTokens", async () => {
  const client = new LLMClient(new MockProvider("x"));
  await assertRejects(
    () => client.complete({
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 0,
    }),
    Error,
    "maxTokens must be positive",
  );
});

// ── Factory ────────────────────────────────────────

Deno.test("createLLMClient throws LLMConfigError when API key is missing", async () => {
  const original = Deno.env.get("OPENAI_API_KEY");
  Deno.env.delete("OPENAI_API_KEY");
  try {
    await assertRejects(
      async () => { createLLMClient(); },
      LLMConfigError,
    );
  } finally {
    if (original) Deno.env.set("OPENAI_API_KEY", original);
  }
});

Deno.test("createLLMClient uses explicit config when provided", () => {
  const client = createLLMClient({
    apiKey: "sk-test-123",
    baseUrl: "https://example.com/v1",
    model: "test-model",
  });
  if (!(client instanceof LLMClient)) {
    throw new Error("expected LLMClient instance");
  }
});

Deno.test("createLLMClient falls back to env when config fields are omitted", () => {
  const originalKey = Deno.env.get("OPENAI_API_KEY");
  const originalBase = Deno.env.get("OPENAI_BASE_URL");
  const originalModel = Deno.env.get("LLM_MODEL");

  Deno.env.set("OPENAI_API_KEY", "sk-from-env");
  Deno.env.delete("OPENAI_BASE_URL");
  Deno.env.delete("LLM_MODEL");

  try {
    const client = createLLMClient();
    if (!(client instanceof LLMClient)) {
      throw new Error("expected LLMClient instance");
    }
  } finally {
    if (originalKey) Deno.env.set("OPENAI_API_KEY", originalKey);
    if (originalBase) Deno.env.set("OPENAI_BASE_URL", originalBase);
    if (originalModel) Deno.env.set("LLM_MODEL", originalModel);
  }
});

// ── ChatCompletionsProvider ────────────────────────

Deno.test("ChatCompletionsProvider parses a successful OpenAI-shaped response", async () => {
  const provider = new ChatCompletionsProvider("key", "https://example.com/v1", "test-model");
  const res = await withMockFetch(() => okResponse("pong", "test-model"), async () => {
    return await provider.chat({
      messages: [{ role: "user", content: "ping" }],
      temperature: 0,
    });
  });
  assertEquals(res.content, "pong");
  assertEquals(res.model, "test-model");
  assertEquals(res.usage.promptTokens, 10);
  assertEquals(res.usage.completionTokens, 5);
});

Deno.test("ChatCompletionsProvider classifies error status codes", async () => {
  const cases: Array<{ status: number; expected: string }> = [
    { status: 401, expected: "auth" },
    { status: 403, expected: "auth" },
    { status: 429, expected: "rate_limit" },
    { status: 500, expected: "server" },
    { status: 502, expected: "server" },
    { status: 400, expected: "unknown" },
  ];

  for (const { status, expected } of cases) {
    const provider = new ChatCompletionsProvider("key", "https://example.com/v1", "test");
    try {
      await withMockFetch(
        () => new Response("error", { status }),
        () => provider.chat({ messages: [{ role: "user", content: "hi" }] }),
      );
      throw new Error(`expected LLMError for status ${status}`);
    } catch (err) {
      if (!(err instanceof LLMError)) {
        throw new Error(`status ${status}: expected LLMError, got ${err}`);
      }
      assertEquals(err.category, expected, `status ${status} category`);
      assertEquals(err.status, status, `status ${status} code`);
    }
  }
});

Deno.test("ChatCompletionsProvider respects timeoutMs", async () => {
  const provider = new ChatCompletionsProvider(
    "key",
    "https://example.com/v1",
    "test",
    { timeoutMs: 100 },
  );

  // Install a fetch shim that rejects when the abort signal fires.
  // This simulates a real fetch call that gets cancelled by AbortController.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = ((_input: unknown, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal as AbortSignal | undefined;
      if (!signal) {
        reject(new Error("no signal passed to fetch"));
        return;
      }
      signal.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
  }) as typeof fetch;

  const start = performance.now();
  try {
    await provider.chat({ messages: [{ role: "user", content: "hi" }] });
    throw new Error("expected LLMError for timeout");
  } catch (err) {
    if (!(err instanceof LLMError)) throw err;
    assertEquals(err.category, "network");
    const elapsed = performance.now() - start;
    // Should abort near 100ms; allow generous tolerance for CI.
    if (elapsed > 1000) throw new Error(`timeout took too long: ${elapsed.toFixed(0)}ms`);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("ChatCompletionsProvider returns network error on fetch failure", async () => {
  const provider = new ChatCompletionsProvider("key", "https://example.com/v1", "test");
  let callCount = 0;
  try {
    await withMockFetch(
      () => {
        callCount++;
        throw new TypeError("Failed to fetch");
      },
      () => provider.chat({ messages: [{ role: "user", content: "hi" }] }),
    );
    throw new Error("expected LLMError");
  } catch (err) {
    if (!(err instanceof LLMError)) throw err;
    assertEquals(err.category, "network");
  }
  assertEquals(callCount, 1);
});
