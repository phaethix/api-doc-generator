import { assertEquals } from "@std/assert";
import { generate } from "../core/generator.ts";
import type { ApiSpec } from "../types/api_spec.ts";

const MINIMAL_SPEC: ApiSpec = {
  info: { title: "Minimal API", version: "0.1.0" },
  paths: {
    "/ping": {
      get: {
        summary: "Health check",
        responses: { "200": { description: "OK" } },
      },
    },
  },
};

const FULL_SPEC: ApiSpec = {
  info: { title: "Pet Store", version: "2.0.0", description: "A pet store API" },
  tags: [{ name: "pets" }],
  paths: {
    "/pets": {
      summary: "Pet operations",
      get: {
        summary: "List pets",
        description: "Returns all pets",
        tags: ["pets"],
        parameters: [
          { name: "limit", in: "query", required: true, schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "A list of pets" },
        },
      },
      post: {
        summary: "Create pet",
        tags: ["pets"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: {
          "201": { description: "Created" },
          "400": { description: "Bad request" },
        },
      },
    },
  },
};

Deno.test("generate returns DocNode with correct api info", () => {
  const doc = generate(MINIMAL_SPEC);
  assertEquals(doc.api.title, "Minimal API");
  assertEquals(doc.api.version, "0.1.0");
});

Deno.test("generate flattens a single endpoint correctly", () => {
  const doc = generate(MINIMAL_SPEC);
  assertEquals(doc.endpoints.length, 1);
  assertEquals(doc.endpoints[0].method, "GET");
  assertEquals(doc.endpoints[0].path, "/ping");
  assertEquals(doc.endpoints[0].summary, "Health check");
  assertEquals(doc.endpoints[0].parameters.length, 0);
});

Deno.test("generate flattens multiple methods on the same path", () => {
  const doc = generate(FULL_SPEC);
  assertEquals(doc.endpoints.length, 2);
  const methods = doc.endpoints.map((e) => e.method).sort();
  assertEquals(methods, ["GET", "POST"]);
});

Deno.test("generate converts parameters to ParamDetail", () => {
  const doc = generate(FULL_SPEC);
  const getEndpoint = doc.endpoints.find((e) => e.method === "GET")!;
  assertEquals(getEndpoint.parameters.length, 1);
  assertEquals(getEndpoint.parameters[0].name, "limit");
  assertEquals(getEndpoint.parameters[0].location, "query");
  assertEquals(getEndpoint.parameters[0].type, "integer");
  assertEquals(getEndpoint.parameters[0].required, true);
});

Deno.test("generate converts requestBody to BodyDetail", () => {
  const doc = generate(FULL_SPEC);
  const postEndpoint = doc.endpoints.find((e) => e.method === "POST")!;
  assertEquals(postEndpoint.requestBody?.type, "object");
  assertEquals(postEndpoint.requestBody?.required, true);
  assertEquals(postEndpoint.requestBody?.contentType, "application/json");
});

Deno.test("generate converts responses to ResponseDetail array", () => {
  const doc = generate(FULL_SPEC);
  const postEndpoint = doc.endpoints.find((e) => e.method === "POST")!;
  assertEquals(postEndpoint.responses.length, 2);
  assertEquals(postEndpoint.responses[0].status, "201");
  assertEquals(postEndpoint.responses[0].description, "Created");
});

Deno.test("generate produces tag groups when tags are defined", () => {
  const doc = generate(FULL_SPEC);
  assertEquals(doc.tags?.length, 1);
  assertEquals(doc.tags![0].name, "pets");
  assertEquals(doc.tags![0].endpoints.length, 2);
});

Deno.test("generate handles array schema labels", () => {
  const spec: ApiSpec = {
    info: { title: "T", version: "1" },
    paths: {
      "/items": {
        get: {
          summary: "List",
          parameters: [
            { name: "ids", in: "query", schema: { type: "array", items: { type: "string" } } },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
    },
  };
  const doc = generate(spec);
  assertEquals(doc.endpoints[0].parameters[0].type, "string[]");
});

Deno.test("generate uses pathItem description as fallback for operation", () => {
  const spec: ApiSpec = {
    info: { title: "T", version: "1" },
    paths: {
      "/x": {
        description: "Path description",
        get: {
          summary: "Op without description",
          responses: { "200": { description: "OK" } },
        },
      },
    },
  };
  const doc = generate(spec);
  assertEquals(doc.endpoints[0].description, "Path description");
});

Deno.test("generate handles empty paths gracefully", () => {
  const spec: ApiSpec = { info: { title: "empty", version: "1" }, paths: {} };
  const doc = generate(spec);
  assertEquals(doc.endpoints.length, 0);
  assertEquals(doc.tags, undefined);
});
