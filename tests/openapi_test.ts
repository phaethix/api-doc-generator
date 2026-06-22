import { assertEquals } from "@std/assert";
import { fromOpenAPI } from "../adapters/openapi.ts";

const MINIMAL_OAS = {
  openapi: "3.1.0",
  info: { title: "Pet Store", version: "1.0.0" },
  paths: {
    "/pets": {
      get: {
        summary: "List pets",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "A list of pets" },
        },
      },
    },
  },
};

const OAS_WITH_NESTED_SCHEMA = {
  openapi: "3.0.3",
  info: { title: "Complex API", version: "2.0", description: "API with nesting" },
  servers: [{ url: "https://api.example.com/v2", description: "Production" }],
  tags: [{ name: "users", description: "User endpoints" }],
  paths: {
    "/users": {
      post: {
        summary: "Create user",
        tags: ["users"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", description: "User full name" },
                  address: {
                    type: "object",
                    properties: {
                      street: { type: "string" },
                      zip: { type: "string", nullable: true },
                    },
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created" },
        },
      },
    },
  },
};

Deno.test("fromOpenAPI returns DocNode with basic info", () => {
  const doc = fromOpenAPI(MINIMAL_OAS);
  assertEquals(doc.api.title, "Pet Store");
  assertEquals(doc.api.version, "1.0.0");
});

Deno.test("fromOpenAPI converts paths to endpoints", () => {
  const doc = fromOpenAPI(MINIMAL_OAS);
  assertEquals(doc.endpoints.length, 1);
  assertEquals(doc.endpoints[0].method, "GET");
  assertEquals(doc.endpoints[0].path, "/pets");
  assertEquals(doc.endpoints[0].summary, "List pets");
});

Deno.test("fromOpenAPI converts parameters", () => {
  const doc = fromOpenAPI(MINIMAL_OAS);
  assertEquals(doc.endpoints[0].parameters.length, 1);
  assertEquals(doc.endpoints[0].parameters[0].name, "limit");
  assertEquals(doc.endpoints[0].parameters[0].type, "integer");
});

Deno.test("fromOpenAPI handles nested object schema in requestBody", () => {
  const doc = fromOpenAPI(OAS_WITH_NESTED_SCHEMA);
  assertEquals(doc.endpoints[0].requestBody?.type, "object");
  assertEquals(doc.endpoints[0].requestBody?.required, true);
});

Deno.test("fromOpenAPI handles servers and tags", () => {
  const doc = fromOpenAPI(OAS_WITH_NESTED_SCHEMA);
  assertEquals(doc.tags?.length, 1);
  assertEquals(doc.tags![0].name, "users");
  assertEquals(doc.endpoints[0].tags, ["users"]);
});

Deno.test("fromOpenAPI handles multiple methods on a path", () => {
  const oas = {
    openapi: "3.0.3",
    info: { title: "T", version: "1" },
    paths: {
      "/items": {
        get: { summary: "List", responses: { "200": { description: "OK" } } },
        post: { summary: "Create", responses: { "201": { description: "Created" } } },
      },
    },
  };
  const doc = fromOpenAPI(oas);
  assertEquals(doc.endpoints.length, 2);
});

Deno.test("fromOpenAPI handles OpenAPI doc with no paths", () => {
  const oas = { openapi: "3.0.3", info: { title: "Empty", version: "1" } };
  const doc = fromOpenAPI(oas);
  assertEquals(doc.endpoints.length, 0);
});
