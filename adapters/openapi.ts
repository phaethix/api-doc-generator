// adapters/openapi.ts
import type { ApiSpec, PathItem, Operation, Parameter, Schema, ApiResponse, RequestBody } from "../types/api_spec.ts";
import type { DocNode } from "../types/doc_node.ts";
import { generate } from "../core/generator.ts";

interface OpenAPIDoc {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  paths?: Record<string, Record<string, unknown>>;
}

export function fromOpenAPI(doc: OpenAPIDoc): DocNode {
  const spec: ApiSpec = {
    info: {
      title: doc.info.title,
      version: doc.info.version,
      description: doc.info.description,
    },
    servers: doc.servers,
    tags: doc.tags,
    paths: {},
  };

  if (doc.paths) {
    for (const [path, methods] of Object.entries(doc.paths)) {
      spec.paths[path] = convertPathItem(methods);
    }
  }

  return generate(spec);
}

function convertPathItem(methods: Record<string, unknown>): PathItem {
  const item: PathItem = {};
  const httpMethods = ["get", "post", "put", "delete", "patch"];

  for (const [method, op] of Object.entries(methods)) {
    if (httpMethods.includes(method)) {
      (item as Record<string, unknown>)[method] = convertOperation(op);
    }
  }

  return item;
}

function convertOperation(raw: unknown): Operation {
  const op = raw as Record<string, unknown>;
  return {
    summary: (op.summary as string) ?? "",
    description: op.description as string | undefined,
    tags: op.tags as string[] | undefined,
    parameters: Array.isArray(op.parameters)
      ? op.parameters.map(convertParameter)
      : undefined,
    requestBody: op.requestBody
      ? convertRequestBody(op.requestBody)
      : undefined,
    responses: convertResponses(op.responses),
  };
}

function convertParameter(raw: unknown): Parameter {
  const p = raw as Record<string, unknown>;
  return {
    name: p.name as string,
    in: p.in as Parameter["in"],
    required: p.required as boolean | undefined,
    description: p.description as string | undefined,
    schema: convertSchema(p.schema),
  };
}

function convertRequestBody(raw: unknown): RequestBody {
  const r = raw as Record<string, unknown>;
  return {
    description: r.description as string | undefined,
    required: r.required as boolean | undefined,
    content: convertContent(r.content),
  };
}

function convertResponses(raw: unknown): Record<string, ApiResponse> {
  const result: Record<string, ApiResponse> = {};
  if (typeof raw !== "object" || raw === null) return result;

  for (const [status, val] of Object.entries(raw as Record<string, unknown>)) {
    const r = val as Record<string, unknown>;
    result[status] = {
      description: (r.description as string) ?? "",
      content: convertContent(r.content),
    };
  }

  return result;
}

function convertContent(raw: unknown): Record<string, { schema: Schema }> {
  const result: Record<string, { schema: Schema }> = {};
  if (typeof raw !== "object" || raw === null) return result;

  for (const [ct, val] of Object.entries(raw as Record<string, unknown>)) {
    const v = val as Record<string, unknown>;
    result[ct] = { schema: convertSchema(v.schema) };
  }

  return result;
}

function convertSchema(raw: unknown): Schema {
  if (typeof raw !== "object" || raw === null) return { type: "string" };
  const s = raw as Record<string, unknown>;
  return {
    type: (s.type as Schema["type"]) ?? "string",
    description: s.description as string | undefined,
    nullable: s.nullable as boolean | undefined,
    items: s.items ? convertSchema(s.items) : undefined,
    properties: s.properties
      ? Object.fromEntries(
          Object.entries(s.properties as Record<string, unknown>).map(
            ([k, v]) => [k, convertSchema(v)],
          ),
        )
      : undefined,
  };
}
