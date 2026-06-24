// handlers/openapi.ts
import { render } from "../core/renderer.ts";
import { fromOpenAPI, OpenAPIDoc } from "../adapters/openapi.ts";
import { ParseError } from "../core/parser.ts";
import {
  CONTENT_TYPES,
  corsHeaders,
  handleApiError,
  readBody,
  resolveFormat,
} from "../shared/utils.ts";

function isOpenAPIDoc(x: unknown): x is OpenAPIDoc {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  if (typeof o["info"] !== "object" || o["info"] === null) return false;
  const info = o["info"] as Record<string, unknown>;
  if (
    typeof info["title"] !== "string" || typeof info["version"] !== "string"
  ) return false;
  // Must have either openapi or swagger version
  return typeof o["openapi"] === "string" || typeof o["swagger"] === "string";
}

export async function handleOpenAPIImport(req: Request): Promise<Response> {
  const format = resolveFormat(req);

  try {
    const body = await readBody(req);

    if (!isOpenAPIDoc(body)) {
      throw new ParseError(
        "Request body is not a valid OpenAPI document (missing openapi/swagger version or info)",
        "openapi",
      );
    }

    const doc = fromOpenAPI(body);
    const output = render(doc, format);

    return new Response(output, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[format],
        ...corsHeaders(),
      },
    });
  } catch (e) {
    return handleApiError(e, "/import/openapi");
  }
}
