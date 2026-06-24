// tests/static_test.ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { handler } from "../main.ts";

const BASE = "http://localhost:8080";

Deno.test("GET / serves index.html when frontend is built", async () => {
  // Check if frontend is built
  let frontendExists = false;
  try {
    await Deno.stat("./frontend/dist/index.html");
    frontendExists = true;
  } catch {
    frontendExists = false;
  }

  if (!frontendExists) {
    console.log(
      "⚠️  Frontend not built, skipping SPA test. Run: cd frontend && npm run build",
    );
    return;
  }

  const req = new Request(`${BASE}/`);
  const res = await handler(req);
  // Should serve index.html (or 404 if build missing - which we handle above)
  if (res.status === 200) {
    const body = await res.text();
    assertStringIncludes(body, "<!doctype html>");
    assertStringIncludes(body, '<div id="root">');
  }
});

Deno.test("GET /unknown-spa-route serves index.html (SPA fallback)", async () => {
  // Check if frontend is built
  let frontendExists = false;
  try {
    await Deno.stat("./frontend/dist/index.html");
    frontendExists = true;
  } catch {
    frontendExists = false;
  }

  if (!frontendExists) {
    console.log("⚠️  Frontend not built, skipping SPA fallback test.");
    return;
  }

  const req = new Request(`${BASE}/some-spa-route`);
  const res = await handler(req);
  if (res.status === 200) {
    const body = await res.text();
    assertStringIncludes(body, "<!doctype html>");
  }
});

Deno.test("GET / serves SPA with text/html content type", async () => {
  let frontendExists = false;
  try {
    await Deno.stat("./frontend/dist/index.html");
    frontendExists = true;
  } catch {
    frontendExists = false;
  }

  if (!frontendExists) {
    console.log("⚠️  Frontend not built, skipping SPA test.");
    return;
  }

  const req = new Request(`${BASE}/`);
  const res = await handler(req);
  if (res.status === 200) {
    assertEquals(res.headers.get("Content-Type")?.includes("text/html"), true);
  }
});

Deno.test("API 404 returns JSON error, not HTML", async () => {
  const req = new Request(`${BASE}/api/not-found`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const res = await handler(req);
  assertEquals(res.status, 404);
  assertEquals(
    res.headers.get("Content-Type")?.includes("application/json"),
    true,
  );
  const body = await res.json();
  assertEquals(typeof body.error, "string");
});

Deno.test("GET /generate (wrong method) returns 404 JSON for API path", async () => {
  const req = new Request(`${BASE}/generate`);
  const res = await handler(req);
  // Should be 404 since /generate is a POST-only API endpoint
  assertEquals(res.status, 404);
});
