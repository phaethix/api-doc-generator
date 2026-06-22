// main.ts
import { resolveRoute } from "./router.ts";
import { logRequest } from "./middleware/logger.ts";

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const start = performance.now();
  const route = resolveRoute(req.method, url);

  let res: Response;
  if (route) {
    res = await route(req);
  } else {
    res = new Response("Not Found", { status: 404 });
  }

  logRequest(req, res, Math.round(performance.now() - start));
  return res;
}

if (import.meta.main) {
  Deno.serve({ port: 8080 }, handler);
  console.log("🚀 API Doc Generator running on http://localhost:8080");
}
