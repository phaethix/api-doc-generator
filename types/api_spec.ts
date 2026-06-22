// types/api_spec.ts
// ── HttpMethod: union type vs enum ─────────────────
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// ── OutputFormat: enum, usable as both value and type ──
export enum OutputFormat {
  Markdown = "markdown",
  HTML     = "html",
  JSON     = "json",
}

// ── Schema: recursive, supports nested objects/arrays ──
export interface Schema {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  nullable?: boolean;
  items?: Schema;
  properties?: Record<string, Schema>;
}

// ── Parameter ──────────────────────────────────────
export interface Parameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema: Schema;
}

// ── ApiResponse ────────────────────────────────────
export interface ApiResponse {
  description: string;
  content?: Record<string, { schema: Schema }>;
}

// ── RequestBody ────────────────────────────────────
export interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: Schema }>;
}

// ── Operation ──────────────────────────────────────
export interface Operation {
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ApiResponse>;
}

// ── PathItem ───────────────────────────────────────
export interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

// ── ApiInfo ────────────────────────────────────────
export interface ApiInfo {
  title: string;
  version: string;
  description?: string;
}

// ── ApiSpec (top-level) ────────────────────────────
export interface ApiSpec {
  info: ApiInfo;
  paths: Record<string, PathItem>;
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
}
