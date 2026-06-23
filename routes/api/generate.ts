import { Handlers } from "$fresh/server.ts";
import { handleGenerate } from "../../handlers/generate.ts";

export const handler: Handlers = {
  POST(req, _ctx) {
    return handleGenerate(req);
  },
};
