import { Handlers } from "$fresh/server.ts";
import { handleHealth } from "../../handlers/health.ts";
import { handleGenerate } from "../../handlers/generate.ts";

export const handler: Handlers = {
  GET(_req, _ctx) {
    return handleHealth(_req);
  },
  POST(req, _ctx) {
    return handleGenerate(req);
  },
};
