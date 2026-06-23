import { Handlers } from "$fresh/server.ts";
import { handleHealth } from "../../handlers/health.ts";

export const handler: Handlers = {
  GET(_req, _ctx) {
    return handleHealth(_req);
  },
};
