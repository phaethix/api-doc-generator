// main.ts
import { resolveRoute } from "./router.ts";
import { logRequest } from "./middleware/logger.ts";
import { isApiPath, corsHeaders } from "./shared/utils.ts";

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const start = performance.now();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
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
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(),
          },
        },
      );
    }
  } else {
    // No route matched
    // If this is an API path with the wrong method, return 404 JSON
    if (isApiPath(url.pathname)) {
      res = new Response(
        JSON.stringify({ error: `Route not found: ${req.method} ${url.pathname}` }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(),
          },
        },
      );
    } else {
      // Non-API path with no match → 404 (static handler should have caught this)
      res = new Response("Not Found", { status: 404 });
    }
  }

  logRequest(req, res, Math.round(performance.now() - start));
  return res;
}

if (import.meta.main) {
  const port = parseInt(Deno.env.get("PORT") ?? "8080");
  Deno.serve({ port }, handler);
  console.log(`API Doc Generator running on http://localhost:${port}`);
  console.log(`  Frontend: http://localhost:${port}/`);
  console.log(`  API:      http://localhost:${port}/health, /generate, /import/openapi`);
}
