import type {
  ApiSpec,
  HealthResponse,
  OutputFormat,
} from "../types";

export interface GenerateOpenAPIRequest {
  description: string;
  scope?: "endpoint" | "document";
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateOpenAPIResponse {
  ok: boolean;
  openapi: unknown;
  scope: "endpoint" | "document";
  format_used: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
  error?: string;
  category?: string;
}

const BASE_URL = "";

async function parseErrorResponse(res: Response): Promise<string> {
  let errorMsg = `Request failed: ${res.status}`;
  try {
    const errData = await res.json();
    if (errData.error) {
      errorMsg = errData.error;
      if (errData.field) {
        errorMsg += ` (field: ${errData.field})`;
      }
    }
  } catch {
    // ignore
  }
  return errorMsg;
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  const text = await res.text();
  if (!text) {
    throw new Error(`Empty response from server (status: ${res.status})`);
  }

  try {
    return JSON.parse(text) as HealthResponse;
  } catch {
    throw new Error(
      `Invalid JSON response from /health (status: ${res.status}): ${text.slice(0, 200)}`,
    );
  }
}

export async function generateDoc(
  spec: ApiSpec,
  format: OutputFormat,
): Promise<{ content: string; contentType: string }> {
  const url = `/generate?format=${format}`;

  const res = await fetch(`${BASE_URL}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(spec),
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  const contentType = res.headers.get("Content-Type") || "text/plain";
  const content = await res.text();

  return { content, contentType };
}

export async function importOpenAPI(
  openApiDoc: unknown,
  format: OutputFormat,
): Promise<{ content: string; contentType: string }> {
  const url = `/import/openapi?format=${format}`;

  const res = await fetch(`${BASE_URL}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(openApiDoc),
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  const contentType = res.headers.get("Content-Type") || "text/plain";
  const content = await res.text();

  return { content, contentType };
}

export async function generateOpenAPI(
  description: string,
  scope: "endpoint" | "document" = "endpoint",
): Promise<GenerateOpenAPIResponse> {
  const res = await fetch(`${BASE_URL}/ai/generate-openapi`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description, scope }),
  });

  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }

  const text = await res.text();
  if (!text) {
    throw new Error(`Empty response from server (status: ${res.status})`);
  }

  let data: GenerateOpenAPIResponse;
  try {
    data = JSON.parse(text) as GenerateOpenAPIResponse;
  } catch {
    throw new Error(
      `Invalid JSON response from server (status: ${res.status}): ${text.slice(0, 200)}`,
    );
  }

  if (!data.ok) {
    const msg = data.error || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

/**
 * Stream OpenAPI generation from the AI.
 *
 * Calls `/ai/generate-openapi-stream` and invokes `onEvent` for each SSE event.
 * Events:
 *   - { type: "delta", content: string }
 *   - { type: "done",  result: GenerateOpenAPIResponse }
 *   - { type: "error", message: string, category?: string }
 */
export async function generateOpenAPIStream(
  description: string,
  scope: "endpoint" | "document" = "endpoint",
  onEvent: (event: { type: string; [key: string]: unknown }) => void,
): Promise<void> {
  const res = await fetch(`${BASE_URL}/ai/generate-openapi-stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ description, scope }),
  });

  if (!res.ok) {
    const msg = await parseErrorResponse(res);
    throw new Error(msg);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const json = trimmed.slice(5).trim();
      if (!json) continue;
      try {
        const event = JSON.parse(json);
        onEvent(event);
      } catch {
        // skip unparseable lines
      }
    }
  }

  // Process any remaining lines in the buffer
  const remaining = buffer.trim();
  if (remaining.startsWith("data:")) {
    const json = remaining.slice(5).trim();
    try {
      const event = JSON.parse(json);
      onEvent(event);
    } catch {
      // ignore
    }
  }
}
