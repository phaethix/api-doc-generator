// Unit tests for LLMClient using a Mock Provider.
// These tests verify the client's forwarding logic without burning real
// tokens or depending on a network connection.

import { LLMClient } from "../client.ts";
import type { ChatRequest, ChatResponse, Provider } from "../types.ts";
import { assertEquals, assertExists } from "@std/assert";

class MockProvider implements Provider {
  constructor(private response: string) {}

  async chat(req: ChatRequest): Promise<ChatResponse> {
    return {
      content: this.response,
      usage: { promptTokens: 10, completionTokens: 5 },
      model: "mock-model",
    };
  }
}

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

  const client = new LLMClient(new CaptureProvider());
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
