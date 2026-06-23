import { describe, it, expect } from "vitest";
import { generate } from "./generator.ts";
import type { ApiSpec } from "../types/api_spec.ts";

const simpleSpec: ApiSpec = {
  info: { title: "Test API", version: "1.0" },
  paths: {
    "/users": {
      get: {
        summary: "Get all users",
        tags: ["users"],
        parameters: [
          { name: "limit", in: "query", required: false, schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Success" } },
      },
    },
  },
};

describe("generate", () => {
  it("produces DocNode with correct api info", () => {
    const doc = generate(simpleSpec);
    expect(doc.api.title).toBe("Test API");
    expect(doc.api.version).toBe("1.0");
  });

  it("flattens paths into endpoints", () => {
    const doc = generate(simpleSpec);
    expect(doc.endpoints).toHaveLength(1);
    expect(doc.endpoints[0].method).toBe("GET");
    expect(doc.endpoints[0].path).toBe("/users");
    expect(doc.endpoints[0].summary).toBe("Get all users");
  });

  it("maps parameters to ParamDetail", () => {
    const doc = generate(simpleSpec);
    const params = doc.endpoints[0].parameters;
    expect(params).toHaveLength(1);
    expect(params[0].name).toBe("limit");
    expect(params[0].location).toBe("query");
    expect(params[0].type).toBe("integer");
    expect(params[0].required).toBe(false);
  });

  it("builds tag groups when tags are defined", () => {
    const specWithTags: ApiSpec = {
      ...simpleSpec,
      tags: [{ name: "users", description: "User management" }],
    };
    const doc = generate(specWithTags);
    expect(doc.tags).toHaveLength(1);
    expect(doc.tags![0].name).toBe("users");
    expect(doc.tags![0].endpoints).toHaveLength(1);
  });

  it("returns no tag groups when tags are absent", () => {
    const doc = generate(simpleSpec);
    expect(doc.tags).toBeUndefined();
  });

  it("handles multiple HTTP methods on same path", () => {
    const spec: ApiSpec = {
      info: { title: "Multi Method API", version: "1.0" },
      paths: {
        "/items": {
          get: { summary: "List items", responses: { "200": { description: "OK" } } },
          post: { summary: "Create item", responses: { "201": { description: "Created" } } },
        },
      },
    };
    const doc = generate(spec);
    expect(doc.endpoints).toHaveLength(2);
    expect(doc.endpoints.map((e) => e.method)).toContain("GET");
    expect(doc.endpoints.map((e) => e.method)).toContain("POST");
  });

  it("handles requestBody", () => {
    const spec: ApiSpec = {
      info: { title: "Body API", version: "1.0" },
      paths: {
        "/items": {
          post: {
            summary: "Create item",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object" } } },
            },
            responses: { "201": { description: "Created" } },
          },
        },
      },
    };
    const doc = generate(spec);
    const body = doc.endpoints[0].requestBody!;
    expect(body.contentType).toBe("application/json");
    expect(body.type).toBe("object");
    expect(body.required).toBe(true);
  });
});
