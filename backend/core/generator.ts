import type { ApiSpec, Operation, PathItem, Parameter } from "../types/api_spec.ts";
import type {
  DocNode,
  Endpoint,
  ParamDetail,
  ResponseDetail,
  BodyDetail,
  TagGroup,
} from "../types/doc_node.ts";

type OperationSummary = Pick<Operation, "summary" | "description">;
type ReadonlySpec = Readonly<ApiSpec>;

export function generate(spec: ReadonlySpec): DocNode {
  const endpoints = flattenPaths(spec.paths);

  return {
    api: {
      title: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
    },
    endpoints,
    tags: buildTagGroups(endpoints, spec.tags),
  };
}

function flattenPaths(paths: Record<string, PathItem>): Endpoint[] {
  const result: Endpoint[] = [];
  const methods = ["get", "post", "put", "delete", "patch"] as const;

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of methods) {
      const op: Operation | undefined = pathItem[method];
      if (op) {
        result.push(buildEndpoint(method.toUpperCase(), path, op, pathItem));
      }
    }
  }

  return result;
}

function buildEndpoint(
  method: string,
  path: string,
  op: Operation,
  pathItem: PathItem,
): Endpoint {
  const summary: OperationSummary = {
    summary: op.summary,
    description: op.description ?? pathItem.description,
  };

  return {
    method,
    path,
    ...summary,
    tags: op.tags ?? [],
    parameters: (op.parameters ?? []).map(toParamDetail),
    requestBody: op.requestBody ? toBodyDetail(op.requestBody) : undefined,
    responses: Object.entries(op.responses).map(([status, r]) => ({
      status,
      description: r.description,
      contentType: firstKey(r.content),
      type: r.content ? schemaLabel(r.content[firstKey(r.content)!]?.schema) : undefined,
    })),
  };
}

function toParamDetail(p: Parameter): ParamDetail {
  return {
    name: p.name,
    location: p.in,
    type: schemaLabel(p.schema),
    required: p.required ?? false,
    description: p.description,
  };
}

function toBodyDetail(b: NonNullable<Operation["requestBody"]>): BodyDetail {
  const ct = firstKey(b.content) ?? "application/json";
  return {
    contentType: ct,
    type: schemaLabel(b.content[ct]?.schema),
    required: b.required ?? false,
    description: b.description,
  };
}

function schemaLabel(s?: { type?: string; items?: { type?: string } }): string {
  if (!s) return "any";
  if (s.type === "array" && s.items) return `${s.items.type ?? "any"}[]`;
  return s.type ?? "any";
}

function buildTagGroups(
  endpoints: Endpoint[],
  tagDefs?: ReadonlySpec["tags"],
): TagGroup[] | undefined {
  if (!tagDefs || tagDefs.length === 0) return undefined;

  return tagDefs.map((t) => ({
    name: t.name,
    description: t.description,
    endpoints: endpoints.filter((e) => e.tags.includes(t.name)),
  }));
}

function firstKey<T extends Record<string, unknown>>(
  obj: T | undefined,
): string | undefined {
  if (!obj) return undefined;
  return Object.keys(obj)[0];
}
