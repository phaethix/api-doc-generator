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
