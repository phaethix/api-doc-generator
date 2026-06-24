import type {
  ApiInfo,
  ApiSpec,
  Operation,
  PathItem,
} from "../types/api_spec.ts";

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

export function parseBody<T>(
  raw: unknown,
  guard: (x: unknown) => x is T,
): T {
  if (!guard(raw)) {
    throw new ParseError("Request body does not match expected schema", "body");
  }
  return raw;
}

export function isApiSpec(x: unknown): x is ApiSpec {
  if (typeof x !== "object" || x === null) return false;
  const obj = x as Record<string, unknown>;
  if (!isApiInfo(obj["info"])) return false;
  if (typeof obj["paths"] !== "object" || obj["paths"] === null) return false;
  return Object.values(obj["paths"] as Record<string, unknown>)
    .every((v) => isPathItem(v));
}

export function isApiInfo(x: unknown): x is ApiInfo {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o["title"] === "string" &&
    typeof o["version"] === "string";
}

export function isPathItem(x: unknown): x is PathItem {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return ["get", "post", "put", "delete", "patch"]
    .every((m) => o[m] === undefined || isOperation(o[m]));
}

export function isOperation(x: unknown): x is Operation {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o["summary"] === "string" &&
    typeof o["responses"] === "object" && o["responses"] !== null;
}
