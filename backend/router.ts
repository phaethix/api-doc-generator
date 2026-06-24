// router.ts
import { handleGenerate } from "./handlers/generate.ts";
import { handleHealth } from "./handlers/health.ts";
import { handleOpenAPIImport } from "./handlers/openapi.ts";
import { handleStatic } from "./handlers/static.ts";
import {
  handleAIGenerateOpenAPI,
  handleAIGenerateOpenAPIStream,
  handleAIPing,
} from "./handlers/ai.ts";

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
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/import/openapi" }),
    handler: handleOpenAPIImport,
  },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/ai/ping" }),
    handler: handleAIPing,
  },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/ai/generate-openapi" }),
    handler: handleAIGenerateOpenAPI,
  },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/ai/generate-openapi-stream" }),
    handler: handleAIGenerateOpenAPIStream,
  },
  {
    method: "GET",
    pattern: new URLPattern({ pathname: "/*" }),
    handler: handleStatic,
  },
];

export function resolveRoute(method: string, url: URL): Handler | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.pattern.test(url)) return route.handler;
  }
  return null;
}
