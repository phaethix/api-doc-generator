// genai/schemas/endpoint.ts
//
// JSON Schema describing a single OpenAPI endpoint (one path + one method).
// Used as `response_format.json_schema.schema` for Phase 2 generation.
//
// We keep the schema purposefully small — just enough fields to be useful
// for an API Doc Generator pipeline, without bloating the prompt.

export const ENDPOINT_SCHEMA_NAME = "OpenAPIEndpoint";

export const endpointSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  additionalProperties: false,
  required: ["method", "path", "summary", "responses"],
  properties: {
    method: {
      type: "string",
      description: "HTTP method for this endpoint.",
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    },
    path: {
      type: "string",
      description: "URL path for this endpoint. Extract from the user's description if explicitly given (e.g. '/api/v1/auth/login'). Otherwise infer a RESTful path based on the resource and action (e.g. '/users/{id}' for get-user-by-id, '/orders' for create-order). NEVER use just '/' — always provide a meaningful resource path starting with '/'.",
      pattern: "^/",
      minLength: 2,
    },
    summary: {
      type: "string",
      description: "A short one-line summary of what this endpoint does.",
      minLength: 1,
      maxLength: 120,
    },
    description: {
      type: "string",
      description: "Detailed explanation of the endpoint's behavior.",
    },
    parameters: {
      type: "array",
      description: "Path, query, or header parameters.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "in"],
        properties: {
          name: { type: "string", minLength: 1 },
          in: { type: "string", enum: ["query", "path", "header", "cookie"] },
          description: { type: "string" },
          required: { type: "boolean" },
          schema: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["string", "integer", "number", "boolean", "array"] },
              format: { type: "string" },
              example: {},
            },
          },
        },
      },
    },
    requestBody: {
      type: "object",
      description: "Request body schema (for POST/PUT/PATCH).",
      additionalProperties: false,
      required: ["content"],
      properties: {
        description: { type: "string" },
        required: { type: "boolean" },
        content: {
          type: "object",
          additionalProperties: false,
          required: ["application/json"],
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
      description: "Map of HTTP status code → response definition.",
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
    tags: {
      type: "array",
      items: { type: "string" },
      description: "Optional tags for grouping in documentation.",
    },
  },
} as const;

export type EndpointSchema = typeof endpointSchema;
