// router.ts
import { handleGenerate } from "./handlers/generate.ts";
import { handleHealth } from "./handlers/health.ts";

type Handler = (req: Request) => Response | Promise<Response>;

interface Route {
  method: string;
  pattern: URLPattern;
  handler: Handler;
}

const routes: Route[] = [
  {
    method: "GET",
    pattern: new URLPattern({ pathname: "/health" }),
    handler: handleHealth,
  },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/generate" }),
    handler: handleGenerate,
  },
];

export function resolveRoute(method: string, url: URL): Handler | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.pattern.test(url)) return route.handler;
  }
  return null;
}
