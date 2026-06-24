// tests/integration_test.ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { handler } from "../main.ts";

const BASE = "http://localhost:8080";

const VALID_BODY = JSON.stringify({
  info: { title: "Integration Test API", version: "1.0" },
  paths: {
    "/echo": {
      get: {
        summary: "Echo back",
        parameters: [
          { name: "msg", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "The echo response" },
        },
      },
    },
  },
});

Deno.test("GET /health returns status ok", async () => {
  const req = new Request(`${BASE}/health`);
  const res = await handler(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, "ok");
  assertEquals(typeof body.timestamp, "string");
});

Deno.test("POST /generate?format=markdown returns markdown", async () => {
  const req = new Request(`${BASE}/generate?format=markdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: VALID_BODY,
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  const body = await res.text();
  assertStringIncludes(body, "# Integration Test API");
  assertStringIncludes(body, "## GET /echo");
  assertStringIncludes(body, "| msg | query | string | Yes | - |");
});

Deno.test("POST /generate?format=html returns HTML", async () => {
  const req = new Request(`${BASE}/generate?format=html`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: VALID_BODY,
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/html; charset=utf-8");
  const body = await res.text();
  assertStringIncludes(body, "<!DOCTYPE html>");
  assertStringIncludes(body, "Integration Test API");
  assertStringIncludes(body, '<span class="method get">GET</span>');
});

Deno.test("POST /generate with Accept: application/json returns JSON", async () => {
  const req = new Request(`${BASE}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: VALID_BODY,
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "application/json; charset=utf-8");
  const body = await res.json();
  assertEquals(body.api.title, "Integration Test API");
  assertEquals(body.endpoints.length, 1);
});

Deno.test("POST /generate returns 400 for invalid body", async () => {
  const req = new Request(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ not: "valid" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(typeof body.error, "string");
});

Deno.test("POST /generate returns 400 for non-JSON body", async () => {
  const req = new Request(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "this is not json",
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(typeof body.error, "string");
});

Deno.test("POST /import/openapi converts OpenAPI to markdown", async () => {
  const openApiBody = JSON.stringify({
    openapi: "3.0.0",
    info: { title: "Pet Store", version: "1.0" },
    paths: {
      "/pets": {
        get: {
          summary: "List pets",
          responses: { "200": { description: "OK" } },
        },
      },
    },
  });

  const req = new Request(`${BASE}/import/openapi?format=markdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: openApiBody,
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  const body = await res.text();
  assertStringIncludes(body, "# Pet Store");
  assertStringIncludes(body, "## GET /pets");
});

Deno.test("POST /import/openapi returns 400 for non-OpenAPI JSON", async () => {
  const req = new Request(`${BASE}/import/openapi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ foo: "bar" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

Deno.test("Unknown API route returns 404", async () => {
  // Test that API-like routes (POST to non-existent endpoint) return 404
  const req = new Request(`${BASE}/api/nonexistent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const res = await handler(req);
  assertEquals(res.status, 404);
  const body = await res.json();
  assertEquals(typeof body.error, "string");
});

Deno.test("Wrong method on /generate returns 404", async () => {
  const req = new Request(`${BASE}/generate`); // GET, not POST
  const res = await handler(req);
  assertEquals(res.status, 404);
});

// ── /ai/generate-openapi ─────────────────────────────

// The AI handler calls createLLMClient() which reads OPENAI_API_KEY from env.
// We don't want real API calls in tests, so we stub a fake key + mock fetch.
Deno.env.set("OPENAI_API_KEY", "test-key-for-integration-tests");

/** Stub global fetch so we can drive the AI handler without a real API. */
function stubFetch(fetchImpl: typeof fetch): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

Deno.test("POST /ai/generate-openapi returns valid endpoint JSON", async () => {
  const aiResponse = JSON.stringify({
    method: "GET",
    path: "/users/{id}",
    summary: "Get user by ID",
    description: "Returns a single user record.",
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
    responses: {
      "200": { description: "OK", content: { "application/json": { schema: { type: "object" } } } },
    },
  });

  const restore = stubFetch(async () =>
    new Response(
      JSON.stringify({
        id: "chatcmpl-test",
        model: "agnes-2.0-flash",
        choices: [{ index: 0, message: { role: "assistant", content: aiResponse }, finish_reason: "stop" }],
        usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  );

  try {
    const req = new Request(`${BASE}/ai/generate-openapi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "A user service with get by id endpoint" }),
    });
    const res = await handler(req);
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.ok, true);
    assertEquals(body.scope, "endpoint");
    assertEquals(body.openapi.method, "GET");
    assertEquals(body.openapi.path, "/users/{id}");
    assertEquals(body.format_used, "json_schema");
    assertEquals(body.usage.promptTokens, 50);
    assertEquals(body.model, "agnes-2.0-flash");
  } finally {
    restore();
  }
});

Deno.test("POST /ai/generate-openapi with scope=document returns full doc", async () => {
  const docResponse = JSON.stringify({
    openapi: "3.0.3",
    info: { title: "Test Service", version: "1.0.0" },
    paths: {
      "/items": {
        get: { summary: "List items" },
        post: { summary: "Create item" },
      },
    },
  });

  const restore = stubFetch(async () =>
    new Response(
      JSON.stringify({
        model: "agnes-2.0-flash",
        choices: [{ index: 0, message: { role: "assistant", content: docResponse }, finish_reason: "stop" }],
        usage: { prompt_tokens: 80, completion_tokens: 200, total_tokens: 280 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  );

  try {
    const req = new Request(`${BASE}/ai/generate-openapi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "A simple items CRUD service", scope: "document" }),
    });
    const res = await handler(req);
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.ok, true);
    assertEquals(body.scope, "document");
    assertEquals(body.openapi.openapi, "3.0.3");
    assertStringIncludes(JSON.stringify(body.openapi.paths), "List items");
  } finally {
    restore();
  }
});

Deno.test("POST /ai/generate-openapi returns 400 for missing description", async () => {
  const req = new Request(`${BASE}/ai/generate-openapi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scope: "endpoint" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.ok, false);
});

Deno.test("POST /ai/generate-openapi returns 400 for invalid JSON body", async () => {
  const req = new Request(`${BASE}/ai/generate-openapi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "not json",
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
});

Deno.test("POST /ai/generate-openapi returns proper error when LLM rejects", async () => {
  const restore = stubFetch(async () =>
    new Response(
      JSON.stringify({ error: { message: "invalid API key" } }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    )
  );

  try {
    const req = new Request(`${BASE}/ai/generate-openapi`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: "test" }),
    });
    const res = await handler(req);
    assertEquals(res.status, 401); // auth → 401
    const body = await res.json();
    assertEquals(body.ok, false);
    assertEquals(body.category, "auth");
  } finally {
    restore();
  }
});

Deno.test("POST /ai/ping returns pong", async () => {
  const restore = stubFetch(async () =>
    new Response(
      JSON.stringify({
        model: "agnes-2.0-flash",
        choices: [{ index: 0, message: { role: "assistant", content: "pong" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  );

  try {
    const req = new Request(`${BASE}/ai/ping`, { method: "POST" });
    const res = await handler(req);
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.ok, true);
    assertEquals(body.reply.trim().toLowerCase(), "pong");
  } finally {
    restore();
  }
});
