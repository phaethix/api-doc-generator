// genai/schemas/document.ts
//
// JSON Schema for a *minimal but valid* OpenAPI 3.0.3 document.
// Designed for the `response_format.json_schema` strict mode: we define the
// shape of an OpenAPI doc that the pipeline (Parser → Generator → Renderer)
// can consume.
//
// We deliberately:
//   - Require `openapi`, `info`, and at least one entry in `paths`.
//   - Keep `components` optional and unbounded (could grow large).
//   - Allow `paths` items to be objects with method keys → operation.

export const DOCUMENT_SCHEMA_NAME = "OpenAPIDocument";

export const documentSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["openapi", "info", "paths"],
  properties: {
    openapi: {
      type: "string",
      const: "3.0.3",
      description: "OpenAPI specification version.",
    },
    info: {
      type: "object",
      additionalProperties: false,
      required: ["title", "version"],
      properties: {
        title: { type: "string", minLength: 1 },
        version: { type: "string", minLength: 1 },
        description: { type: "string" },
      },
    },
    servers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["url"],
        properties: {
          url: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    paths: {
      type: "object",
      minProperties: 1,
      description: "Map of URL paths → operations.",
      additionalProperties: {
        type: "object",
        additionalProperties: {
          // Each method object accepts a subset of an OpenAPI Operation.
          type: "object",
          additionalProperties: false,
          required: ["summary", "responses"],
          properties: {
            summary: { type: "string" },
            description: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            parameters: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "in"],
                properties: {
                  name: { type: "string" },
                  in: { type: "string", enum: ["query", "path", "header"] },
                  required: { type: "boolean" },
                  schema: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                    },
                  },
                },
              },
            },
            requestBody: {
              type: "object",
              properties: {
                required: { type: "boolean" },
                content: {
                  type: "object",
                  properties: {
                    "application/json": {
                      type: "object",
                      properties: {
                        schema: { type: "object" },
                        example: { type: "object" },
                      },
                    },
                  },
                },
              },
            },
            responses: {
              type: "object",
              additionalProperties: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  content: {
                    type: "object",
                    properties: {
                      "application/json": {
                        type: "object",
                        properties: {
                          schema: { type: "object" },
                          example: { type: "object" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      type: "object",
      description: "Reusable schemas, parameters, responses, etc.",
      properties: {
        schemas: { type: "object" },
        parameters: { type: "object" },
        responses: { type: "object" },
      },
    },
  },
} as const;

export type DocumentSchema = typeof documentSchema;
