export type OutputFormat = "markdown" | "html" | "json";

export interface ApiSpec {
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: Record<string, Record<string, unknown>>;
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
}

export interface GenerateResponse {
  success: boolean;
  data?: string;
  error?: string;
  field?: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface OpenAPIImportResponse {
  success: boolean;
  data?: string;
  format?: OutputFormat;
  error?: string;
}
