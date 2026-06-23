import { assertEquals, assertStringIncludes } from "@std/assert";
import { handler } from "./legacy_handler.ts";

Deno.test("GET /health returns ok status", async () => {
  const res = await handler(new Request("http://localhost/health"));
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, "ok");
  assertEquals(typeof body.timestamp, "string");
});

Deno.test("POST /generate returns 200 for valid spec", async () => {
  const res = await handler(
    new Request("http://localhost/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        info: { title: "Smoke Test", version: "1.0" },
        paths: {
          "/test": {
            get: {
              summary: "Test endpoint",
              responses: { "200": { description: "OK" } },
            },
          },
        },
      }),
    }),
  );
  assertEquals(res.status, 200);
  const body = await res.text();
  assertStringIncludes(body, "# Smoke Test");
});
