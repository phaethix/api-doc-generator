import { describe, it, expect } from "vitest";
import { isApiSpec, isApiInfo, isPathItem, isOperation, parseBody, ParseError } from "./parser.ts";

describe("isApiInfo", () => {
  it("accepts valid ApiInfo", () => {
    expect(isApiInfo({ title: "My API", version: "1.0" })).toBe(true);
  });

  it("rejects missing title", () => {
    expect(isApiInfo({ version: "1.0" })).toBe(false);
  });

  it("rejects missing version", () => {
    expect(isApiInfo({ title: "My API" })).toBe(false);
  });

  it("rejects non-objects", () => {
    expect(isApiInfo(null)).toBe(false);
    expect(isApiInfo("string")).toBe(false);
  });
});

describe("isOperation", () => {
  it("accepts valid Operation", () => {
    expect(isOperation({ summary: "Get items", responses: { "200": { description: "OK" } } })).toBe(true);
  });

  it("rejects missing summary", () => {
    expect(isOperation({ responses: { "200": { description: "OK" } } })).toBe(false);
  });

  it("rejects missing responses", () => {
    expect(isOperation({ summary: "Get items" })).toBe(false);
  });
});

describe("isPathItem", () => {
  it("accepts valid PathItem", () => {
    expect(isPathItem({ get: { summary: "List", responses: { "200": { description: "OK" } } } })).toBe(true);
  });

  it("accepts empty PathItem", () => {
    expect(isPathItem({})).toBe(true);
  });

  it("rejects invalid operation", () => {
    expect(isPathItem({ get: { summary: "Bad" } })).toBe(false);
  });
});

describe("isApiSpec", () => {
  it("accepts valid ApiSpec", () => {
    expect(isApiSpec({
      info: { title: "My API", version: "1.0" },
      paths: { "/items": { get: { summary: "List", responses: { "200": { description: "OK" } } } } },
    })).toBe(true);
  });

  it("rejects missing info", () => {
    expect(isApiSpec({ paths: {} })).toBe(false);
  });

  it("rejects missing paths", () => {
    expect(isApiSpec({ info: { title: "My API", version: "1.0" } })).toBe(false);
  });

  it("rejects null", () => {
    expect(isApiSpec(null)).toBe(false);
  });
});

describe("parseBody", () => {
  it("returns value when guard passes", () => {
    const result = parseBody({ title: "My API", version: "1.0" }, isApiInfo);
    expect(result.title).toBe("My API");
  });

  it("throws ParseError when guard fails", () => {
    expect(() => parseBody({ not: "valid" }, isApiInfo)).toThrow(ParseError);
  });
});
