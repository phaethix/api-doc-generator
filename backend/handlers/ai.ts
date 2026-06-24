// handlers/ai.ts — AI endpoints.
//
// Phase 1: /ai/ping   — verify LLM client wiring.
// Phase 2: /ai/generate-openapi — convert natural language → OpenAPI JSON.

import {
  createLLMClient,
  LLMError,
  LLMConfigError,
  generateOpenAPIEndpoint,
  generateOpenAPIDocument,
  type LLMErrorCategory,
  type OpenAPIScope,
} from "../../genai/index.ts";

// Map LLMError categories to HTTP status codes.
// This keeps the handler thin — error semantics live in the genai module.
const STATUS_BY_CATEGORY: Record<LLMErrorCategory, number> = {
  auth: 401,
  rate_limit: 429,
  server: 502,
  network: 503,
  unknown: 500,
};

// /ai/ping

export async function handleAIPing(_req: Request): Promise<Response> {
  try {
    const client = createLLMClient();
    const res = await client.complete({
      messages: [
        { role: "system", content: "You are a helpful assistant. Reply concisely." },
        { role: "user", content: "Reply with exactly the single word: pong" },
      ],
      temperature: 0,
      maxTokens: 10,
    });

    return Response.json({
      ok: true,
      reply: res.content,
      usage: res.usage,
      model: res.model,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// /ai/generate-openapi

interface GenerateOpenAPIBody {
  description: string;
  scope?: OpenAPIScope;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export async function handleAIGenerateOpenAPI(req: Request): Promise<Response> {
  let body: GenerateOpenAPIBody;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  // Validate input.
  if (!body.description || typeof body.description !== "string" || body.description.trim().length === 0) {
    return Response.json(
      { ok: false, error: "Field 'description' is required and must be a non-empty string" },
      { status: 400 },
    );
  }

  const scope: OpenAPIScope = body.scope ?? "endpoint";
  if (scope !== "endpoint" && scope !== "document") {
    return Response.json(
      { ok: false, error: "Field 'scope' must be 'endpoint' or 'document'" },
      { status: 400 },
    );
  }

  try {
    const client = createLLMClient();
    const result = scope === "endpoint"
      ? await generateOpenAPIEndpoint(client, body.description.trim(), {
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          timeoutMs: body.timeoutMs,
        })
      : await generateOpenAPIDocument(client, body.description.trim(), {
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          timeoutMs: body.timeoutMs,
        });

    return Response.json({
      ok: true,
      openapi: result.openapi,
      scope: result.scope,
      format_used: result.formatUsed,
      usage: result.usage,
      model: result.model,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

// Error normalization

function toErrorResponse(err: unknown): Response {
  if (err instanceof LLMError) {
    const status = STATUS_BY_CATEGORY[err.category] ?? 500;
    return Response.json(
      { ok: false, error: err.message, category: err.category },
      { status },
    );
  }
  if (err instanceof LLMConfigError) {
    return Response.json(
      { ok: false, error: err.message, category: "config" },
      { status: 500 },
    );
  }
  const message = err instanceof Error ? err.message : String(err);
  return Response.json({ ok: false, error: message }, { status: 500 });
}
