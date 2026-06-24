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
