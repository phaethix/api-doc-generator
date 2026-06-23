import type {
  ApiSpec,
  GenerateResponse,
  HealthResponse,
  OutputFormat,
} from "../types";

const getBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return "";
  }
  return "";
};

const BASE_URL = getBaseUrl();

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let errorMsg = `请求失败: ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.error) {
        errorMsg = errData.error;
        if (errData.field) {
          errorMsg += ` (字段: ${errData.field})`;
        }
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export async function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
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
    let errorMsg = `生成失败: ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.error) {
        errorMsg = errData.error;
        if (errData.field) {
          errorMsg += ` (字段: ${errData.field})`;
        }
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
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
    let errorMsg = `导入失败: ${res.status}`;
    try {
      const errData = await res.json();
      if (errData.error) {
        errorMsg = errData.error;
      }
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  const contentType = res.headers.get("Content-Type") || "text/plain";
  const content = await res.text();

  return { content, contentType };
}

export type { GenerateResponse };
