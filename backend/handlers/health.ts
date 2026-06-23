// handlers/health.ts
import { corsHeaders } from "../shared/utils.ts";

export function handleHealth(_req: Request): Response {
  return new Response(
    JSON.stringify({
      status: "ok",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders(),
      },
    },
  );
}
