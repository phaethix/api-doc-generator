// handlers/generate.ts
import { parseBody, isApiSpec } from "../core/parser.ts";
import { generate } from "../core/generator.ts";
import { render } from "../core/renderer.ts";
import { resolveFormat, CONTENT_TYPES, readBody, handleApiError, corsHeaders } from "../shared/utils.ts";

// Custom business error
export class GenerateError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GenerateError";
  }
}

// Main handler
export async function handleGenerate(req: Request): Promise<Response> {
  const format = resolveFormat(req);

  try {
    const body = await readBody(req);
    const spec = parseBody(body, isApiSpec);
    const doc  = generate(spec);
    const output = render(doc, format);

    return new Response(output, {
      status: 200,
      headers: {
        "Content-Type": CONTENT_TYPES[format],
        ...corsHeaders(),
      },
    });
  } catch (e) {
    return handleApiError(e, "/generate");
  }
}
