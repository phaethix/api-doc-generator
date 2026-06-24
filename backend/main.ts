// main.ts — HTTP entry point for the API Doc Generator backend.
//
// Responsibilities:
//   1. Load environment variables from project root .env
//   2. Compose the request handler (router + middleware)
//   3. Start Deno.serve

import { loadProjectEnv } from "./shared/env.ts";
import { dirname, fromFileUrl } from "@std/path";
import { resolveRoute } from "./router.ts";
import { logRequest } from "./middleware/logger.ts";
import { corsHeaders, isApiPath } from "./shared/utils.ts";

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const start = performance.now();

  // CORS preflight.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const route = resolveRoute(req.method, url);

  let res: Response;
  if (route) {
    try {
      res = await route(req);
    } catch (e) {
      console.error("Unhandled error in route handler:", e);
      res = new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        },
      );
    }
  } else if (isApiPath(url.pathname)) {
    res = new Response(
      JSON.stringify({
        error: `Route not found: ${req.method} ${url.pathname}`,
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      },
    );
  } else {
    res = new Response("Not Found", { status: 404 });
  }

  logRequest(req, res, Math.round(performance.now() - start));
  return res;
}

if (import.meta.main) {
  // Load .env before anything else so route handlers see the right config.
  const here = import.meta.dirname ?? dirname(fromFileUrl(import.meta.url));
  const envPath = await loadProjectEnv({ from: here });
  if (envPath) {
    console.log(`[env] loaded ${envPath}`);
  }

  const port = parseInt(Deno.env.get("PORT") ?? "8080");
  Deno.serve({ port }, handler);
  console.log(`API Doc Generator running on http://localhost:${port}`);
  console.log(`  Frontend: http://localhost:${port}/`);
  console.log(
    `  API:      http://localhost:${port}/health, /generate, /import/openapi`,
  );
  console.log(
    `  AI:       http://localhost:${port}/ai/ping, /ai/generate-openapi`,
  );
}
