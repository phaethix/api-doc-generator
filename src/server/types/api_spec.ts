// types/api_spec.ts
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export enum OutputFormat {
  Markdown = "markdown",
  HTML = "html",
  JSON = "json",
}

export interface Schema {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  nullable?: boolean;
  items?: Schema;
  properties?: Record<string, Schema>;
}

export interface Parameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema: Schema;
}

export interface ApiResponse {
  description: string;
  content?: Record<string, { schema: Schema }>;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: Schema }>;
}

export interface Operation {
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ApiResponse>;
}

export interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

export interface ApiInfo {
  title: string;
  version: string;
  description?: string;
}

export interface ApiSpec {
  info: ApiInfo;
  paths: Record<string, PathItem>;
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
}
