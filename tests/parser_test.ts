import { assertEquals, assertThrows } from "@std/assert";
import { isApiSpec, isApiInfo, isPathItem, isOperation, parseBody, ParseError } from "../core/parser.ts";
import type { ApiSpec } from "../types/api_spec.ts";

const VALID_SPEC: ApiSpec = {
  info: { title: "Test API", version: "1.0.0" },
  paths: {
    "/users": {
      get: {
        summary: "List users",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          "200": { description: "Success" },
        },
      },
      post: {
        summary: "Create user",
        requestBody: {
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: {
          "201": { description: "Created" },
        },
      },
    },
  },
};

Deno.test("isApiSpec returns true for a valid spec", () => {
  assertEquals(isApiSpec(VALID_SPEC), true);
});

Deno.test("isApiSpec returns false for null / non-object / missing info", () => {
  assertEquals(isApiSpec(null), false);
  assertEquals(isApiSpec(42), false);
  assertEquals(isApiSpec("hello"), false);
  assertEquals(isApiSpec({ info: { title: "X", version: "1" } }), false);
  assertEquals(isApiSpec({ paths: {} }), false);
});

Deno.test("isApiSpec returns false when info.title or info.version is missing", () => {
  assertEquals(isApiSpec({ info: { version: "1" }, paths: {} }), false);
  assertEquals(isApiSpec({ info: { title: "X" }, paths: {} }), false);
});

Deno.test("isApiSpec returns false for invalid path methods", () => {
  assertEquals(
    isApiSpec({
      info: { title: "X", version: "1" },
      paths: { "/x": { get: { summary: 123, responses: {} } } },
    }),
    false,
  );
});

Deno.test("isApiSpec returns false when operation lacks summary or responses", () => {
  assertEquals(
    isApiSpec({
      info: { title: "X", version: "1" },
      paths: { "/x": { get: { responses: {} } } },
    }),
    false,
  );
  assertEquals(
    isApiSpec({
      info: { title: "X", version: "1" },
      paths: { "/x": { get: { summary: "s" } } },
    }),
    false,
  );
});

Deno.test("parseBody returns typed object on valid input", () => {
  const result = parseBody(VALID_SPEC, isApiSpec);
  assertEquals(result.info.title, "Test API");
  assertEquals(result.paths["/users"].get?.summary, "List users");
});

Deno.test("parseBody throws ParseError on invalid input", () => {
  assertThrows(
    () => parseBody({}, isApiSpec),
    ParseError,
    "does not match expected schema",
  );
});

Deno.test("ParseError has name and optional field properties", () => {
  const err = new ParseError("bad input", "info.title");
  assertEquals(err.name, "ParseError");
  assertEquals(err.field, "info.title");
  assertEquals(err.message, "bad input");
});
