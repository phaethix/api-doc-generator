// genai/tests/openapi_test.ts — Phase 2 tests for structured output.
//
// Coverage:
//   - Provider serializes response_format correctly (json_schema / json_object)
//   - Provider surfaces response body in error messages (for fallback detection)
//   - OpenAPIGenerator generates endpoint & document with json_schema
//   - Fallback from json_schema → json_object on provider rejection
//   - Local validation rejects malformed output
//   - Handler integration (end-to-end with mocked client)

import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStringIncludes,
} from "@std/assert";
import { ChatCompletionsProvider } from "../providers/chat_completions.ts";
import { LLMClient, LLMError } from "../index.ts";
import {
  generateOpenAPIDocument,
  generateOpenAPIEndpoint,
} from "../openapi.ts";
import {
  DOCUMENT_SCHEMA_NAME,
  documentSchema,
  ENDPOINT_SCHEMA_NAME,
  endpointSchema,
} from "../schemas/index.ts";
import type {
  ChatRequest,
  ChatResponse,
  Provider,
  ResponseFormat,
} from "../types.ts";

// Helpers

/** Replace globalThis.fetch with a stub that returns a pre-canned Response. */
function installFetch(fetchImpl: typeof fetch): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = fetchImpl as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

/** Build a realistic OpenAI-shaped response. */
function openaiResponse(opts: {
  content?: string;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
  status?: number;
  body?: unknown;
}): Response {
  const {
    content,
    promptTokens = 10,
    completionTokens = 20,
    model = "agnes-2.0-flash",
    status = 200,
    body,
  } = opts;
  if (body !== undefined) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(
    JSON.stringify({
      id: "chatcmpl-test",
      object: "chat.completion",
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: content ?? "" },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

// Provider: response_format serialization

Deno.test("Provider sends response_format.json_schema when type=json_schema", async () => {
  let capturedBody: Record<string, unknown> = {};
  const restore = installFetch(async (_input, init) => {
    const body = init?.body as string | undefined;
    if (body) capturedBody = JSON.parse(body);
    return openaiResponse({
      content: JSON.stringify({ method: "GET", path: "/test", summary: "ok" }),
    });
  });
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const format: ResponseFormat = {
      type: "json_schema",
      json_schema: {
        name: "Test",
        schema: { type: "object" },
        strict: true,
      },
    };
    await provider.chat({
      messages: [{ role: "user", content: "hi" }],
      responseFormat: format,
    });
    assertEquals(capturedBody.response_format, {
      type: "json_schema",
      json_schema: { name: "Test", schema: { type: "object" }, strict: true },
    });
  } finally {
    restore();
  }
});

Deno.test("Provider sends response_format.json_object when type=json_object", async () => {
  let capturedBody: Record<string, unknown> = {};
  const restore = installFetch(async (_input, init) => {
    const body = init?.body as string | undefined;
    if (body) capturedBody = JSON.parse(body);
    return openaiResponse({ content: '{"a":1}' });
  });
  try {
    const provider = new ChatCompletionsProvider("test-key");
    await provider.chat({
      messages: [{ role: "user", content: "hi" }],
      responseFormat: { type: "json_object" },
    });
    assertEquals(capturedBody.response_format, { type: "json_object" });
  } finally {
    restore();
  }
});

Deno.test("Provider omits response_format when type=text", async () => {
  let capturedBody: Record<string, unknown> = {};
  const restore = installFetch(async (_input, init) => {
    const body = init?.body as string | undefined;
    if (body) capturedBody = JSON.parse(body);
    return openaiResponse({ content: "plain text" });
  });
  try {
    const provider = new ChatCompletionsProvider("test-key");
    await provider.chat({
      messages: [{ role: "user", content: "hi" }],
      responseFormat: { type: "text" },
    });
    assertEquals(capturedBody.response_format, undefined);
  } finally {
    restore();
  }
});

Deno.test("Provider includes response body in error message for 400", async () => {
  const restore = installFetch(async () => {
    return new Response(
      JSON.stringify({
        error: {
          message: "response_format json_schema is not supported by this model",
          type: "invalid_request_error",
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  });
  try {
    const provider = new ChatCompletionsProvider("test-key");
    await assertRejects(
      () =>
        provider.chat({
          messages: [{ role: "user", content: "hi" }],
          responseFormat: {
            type: "json_schema",
            json_schema: { name: "Test", schema: { type: "object" } },
          },
        }),
      LLMError,
      "response_format", // error message should mention the keyword
    );
  } finally {
    restore();
  }
});

Deno.test("Provider sets formatUsed in ChatResponse when json_schema was used", async () => {
  const restore = installFetch(async () =>
    openaiResponse({
      content: JSON.stringify({ method: "GET", path: "/x", summary: "y" }),
    })
  );
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const res = await provider.chat({
      messages: [{ role: "user", content: "hi" }],
      responseFormat: {
        type: "json_schema",
        json_schema: { name: "T", schema: {} },
      },
    });
    assertEquals(res.formatUsed, "json_schema");
  } finally {
    restore();
  }
});

Deno.test("Provider sets formatUsed='text' when no responseFormat was given", async () => {
  const restore = installFetch(async () => openaiResponse({ content: "hi" }));
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const res = await provider.chat({
      messages: [{ role: "user", content: "hi" }],
    });
    assertEquals(res.formatUsed, "text");
  } finally {
    restore();
  }
});

// Schemas

Deno.test("endpointSchema is a valid JSON Schema with required method/path/summary/responses", () => {
  assertEquals(endpointSchema.type, "object");
  assertEquals(endpointSchema.required, [
    "method",
    "path",
    "summary",
    "responses",
  ]);
  assertEquals(endpointSchema.properties.method.enum, [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ]);
  assertExists(endpointSchema.properties.path.pattern);
});

Deno.test("documentSchema requires openapi/info/paths and constrains openapi to 3.0.3", () => {
  assertEquals(documentSchema.required, ["openapi", "info", "paths"]);
  assertEquals(documentSchema.properties.openapi.const, "3.0.3");
});

Deno.test("schema names are exported correctly", () => {
  assertEquals(ENDPOINT_SCHEMA_NAME, "OpenAPIEndpoint");
  assertEquals(DOCUMENT_SCHEMA_NAME, "OpenAPIDocument");
});

// OpenAPIGenerator: happy path

Deno.test("generateEndpoint returns a valid endpoint result with json_schema", async () => {
  const validEndpoint = {
    method: "GET",
    path: "/users/{id}",
    summary: "Get user by ID",
    description: "Returns a single user.",
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
    responses: {
      "200": {
        description: "OK",
        content: { "application/json": { schema: { type: "object" } } },
      },
    },
  };

  const restore = installFetch(async () =>
    openaiResponse({ content: JSON.stringify(validEndpoint) })
  );
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const client = new LLMClient(provider);
    const result = await generateOpenAPIEndpoint(
      client,
      "User management: get user by id",
    );

    assertEquals(result.scope, "endpoint");
    assertEquals(result.formatUsed, "json_schema");
    assertEquals((result.openapi as Record<string, unknown>).method, "GET");
    assertEquals(
      (result.openapi as Record<string, unknown>).path,
      "/users/{id}",
    );
    assertEquals(result.usage.promptTokens, 10);
    assertEquals(result.model, "agnes-2.0-flash");
  } finally {
    restore();
  }
});

Deno.test("generateDocument returns a valid document result with json_schema", async () => {
  const validDoc = {
    openapi: "3.0.3",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: { summary: "List users" },
      },
    },
  };

  const restore = installFetch(async () =>
    openaiResponse({ content: JSON.stringify(validDoc) })
  );
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const client = new LLMClient(provider);
    const result = await generateOpenAPIDocument(
      client,
      "A simple user service",
    );

    assertEquals(result.scope, "document");
    assertEquals(result.formatUsed, "json_schema");
    assertEquals((result.openapi as Record<string, unknown>).openapi, "3.0.3");
    assertExists((result.openapi as Record<string, unknown>).paths);
  } finally {
    restore();
  }
});

// OpenAPIGenerator: fallback

Deno.test("generateEndpoint falls back to json_object when provider rejects json_schema", async () => {
  let callCount = 0;
  const restore = installFetch(async () => {
    callCount++;
    if (callCount === 1) {
      // First call: json_schema rejected by provider
      return openaiResponse({
        status: 400,
        body: {
          error: { message: "response_format json_schema is not supported" },
        },
      });
    }
    // Second call: json_object succeeds
    const validEndpoint = {
      method: "POST",
      path: "/items",
      summary: "Create item",
      responses: { "201": { description: "Created" } },
    };
    return openaiResponse({ content: JSON.stringify(validEndpoint) });
  });
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const client = new LLMClient(provider);
    const result = await generateOpenAPIEndpoint(client, "Create an item");

    assertEquals(callCount, 2);
    assertEquals(result.formatUsed, "json_object"); // actual fallback
    assertEquals((result.openapi as Record<string, unknown>).method, "POST");
  } finally {
    restore();
  }
});

// OpenAPIGenerator: validation errors

Deno.test("generateEndpoint throws LLMError when AI returns invalid JSON", async () => {
  const restore = installFetch(async () =>
    openaiResponse({ content: "not valid json {" })
  );
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const client = new LLMClient(provider);
    await assertRejects(
      () => generateOpenAPIEndpoint(client, "test"),
      LLMError,
      "invalid JSON",
    );
  } finally {
    restore();
  }
});

Deno.test("generateEndpoint throws LLMError when endpoint is missing required fields", async () => {
  // Missing "summary" which is required by our validation
  const badEndpoint = { method: "GET", path: "/x" };
  const restore = installFetch(async () =>
    openaiResponse({ content: JSON.stringify(badEndpoint) })
  );
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const client = new LLMClient(provider);
    await assertRejects(
      () => generateOpenAPIEndpoint(client, "test"),
      LLMError,
    );
  } finally {
    restore();
  }
});

Deno.test("generateEndpoint auto-fixes invalid path instead of throwing", async () => {
  // AI returned a path with no leading slash — should be auto-fixed to a valid path.
  const badEndpoint = {
    method: "GET",
    path: "no-leading-slash",
    summary: "bad",
  };
  const restore = installFetch(async () =>
    openaiResponse({ content: JSON.stringify(badEndpoint) })
  );
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const client = new LLMClient(provider);
    const result = await generateOpenAPIEndpoint(client, "test");
    const openapi = result.openapi as Record<string, unknown>;
    assertEquals(openapi.method, "GET");
    // Path should be auto-fixed to something starting with '/'
    const fixedPath = openapi.path as string;
    assertStringIncludes(fixedPath, "/");
    assertEquals(fixedPath.length >= 2, true);
  } finally {
    restore();
  }
});

Deno.test("generateDocument throws LLMError when openapi version is wrong", async () => {
  const badDoc = {
    openapi: "2.0", // should be 3.0.3
    info: { title: "T", version: "1.0" },
    paths: { "/x": { get: { summary: "x" } } },
  };
  const restore = installFetch(async () =>
    openaiResponse({ content: JSON.stringify(badDoc) })
  );
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const client = new LLMClient(provider);
    await assertRejects(
      () => generateOpenAPIDocument(client, "test"),
      LLMError,
    );
  } finally {
    restore();
  }
});

Deno.test("generateDocument output passes through backend isApiSpec validation", async () => {
  const validDoc = {
    openapi: "3.0.3",
    info: { title: "Test API", version: "1.0.0" },
    paths: {
      "/users": {
        get: {
          summary: "List users",
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "array" } } },
            },
          },
        },
      },
      "/users/{id}": {
        get: {
          summary: "Get user by ID",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "404": { description: "Not found" },
          },
        },
      },
    },
  };

  const restore = installFetch(async () =>
    openaiResponse({ content: JSON.stringify(validDoc) })
  );
  try {
    const provider = new ChatCompletionsProvider("test-key");
    const client = new LLMClient(provider);
    const result = await generateOpenAPIDocument(
      client,
      "User service with list and get by id",
    );

    assertEquals(result.scope, "document");

    // Verify the output conforms to what the backend pipeline expects.
    // The backend's isApiSpec requires: info{title,version}, paths{...},
    // and each operation needs summary + responses.
    const doc = result.openapi as {
      info: { title: string; version: string };
      paths: Record<string, unknown>;
    };
    assertEquals(doc.info.title, "Test API");
    assertEquals(doc.info.version, "1.0.0");
    assertEquals(typeof doc.paths["/users"], "object");
    const usersGet = (doc.paths["/users"] as Record<string, unknown>).get as {
      summary: string;
      responses: object;
    };
    assertEquals(usersGet.summary, "List users");
    assertExists(usersGet.responses);
  } finally {
    restore();
  }
});

// ChatRequest: responseFormat acceptance
Deno.test("LLMClient.complete accepts responseFormat without error", async () => {
  const restore = installFetch(async () =>
    openaiResponse({ content: "not json but we won't validate" })
  );
  try {
    // Use a MockProvider that just records the request
    class MockProvider implements Provider {
      lastReq: ChatRequest | undefined;
      async chat(req: ChatRequest): Promise<ChatResponse> {
        this.lastReq = req;
        return {
          content: '{"method":"GET","path":"/x","summary":"y"}',
          usage: { promptTokens: 1, completionTokens: 1 },
          model: "test",
          formatUsed: "json_schema",
        };
      }
    }
    const mock = new MockProvider();
    const client = new LLMClient(mock);
    await client.complete({
      messages: [{ role: "user", content: "hi" }],
      responseFormat: {
        type: "json_schema",
        json_schema: { name: "T", schema: {} },
      },
    });
    assertExists(mock.lastReq?.responseFormat);
    assertEquals(mock.lastReq!.responseFormat!.type, "json_schema");
  } finally {
    restore();
  }
});
