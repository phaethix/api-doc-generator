#!/usr/bin/env -S deno run -A main.ts
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";

console.log("🚀 API Doc Generator running on http://localhost:8080");
await start(manifest, config);
