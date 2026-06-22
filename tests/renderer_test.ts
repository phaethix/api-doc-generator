import { assertEquals, assertStringIncludes } from "@std/assert";
import { render } from "../core/renderer.ts";
import { OutputFormat } from "../types/api_spec.ts";
import type { DocNode } from "../types/doc_node.ts";

const EMPTY_DOC: DocNode = {
  api: { title: "Empty API", version: "0.0.0" },
  endpoints: [],
};

const SINGLE_DOC: DocNode = {
  api: { title: "My API", version: "1.0.0", description: "A sample API" },
  endpoints: [
    {
      method: "GET",
      path: "/users",
      summary: "List all users",
      description: "Returns a paginated list of users",
      tags: ["users"],
      parameters: [
        { name: "page", location: "query", type: "integer", required: false, description: "Page number" },
        { name: "limit", location: "query", type: "integer", required: false, description: "Items per page" },
      ],
      requestBody: undefined,
      responses: [
        { status: "200", description: "A JSON array of users", contentType: "application/json" },
        { status: "401", description: "Unauthorized" },
      ],
    },
    {
      method: "POST",
      path: "/users",
      summary: "Create a user",
      tags: ["users"],
      parameters: [],
      requestBody: {
        contentType: "application/json",
        type: "object",
        required: true,
        description: "User to create",
      },
      responses: [
        { status: "201", description: "User created" },
      ],
    },
  ],
  tags: [
    { name: "users", description: "User operations", endpoints: [] },
  ],
};

Deno.test("render returns JSON string for JSON format", () => {
  const output = render(EMPTY_DOC, OutputFormat.JSON);
  const parsed = JSON.parse(output);
  assertEquals(parsed.api.title, "Empty API");
  assertEquals(parsed.endpoints.length, 0);
});

Deno.test("render JSON includes all fields", () => {
  const output = render(SINGLE_DOC, OutputFormat.JSON);
  const parsed = JSON.parse(output);
  assertEquals(parsed.endpoints.length, 2);
  assertEquals(parsed.endpoints[0].method, "GET");
});

Deno.test("render Markdown includes h1 title", () => {
  const output = render(SINGLE_DOC, OutputFormat.Markdown);
  assertStringIncludes(output, "# My API");
});

Deno.test("render Markdown includes version", () => {
  const output = render(SINGLE_DOC, OutputFormat.Markdown);
  assertStringIncludes(output, "Version: 1.0.0");
});

Deno.test("render Markdown includes endpoint method and path", () => {
  const output = render(SINGLE_DOC, OutputFormat.Markdown);
  assertStringIncludes(output, "## GET /users");
  assertStringIncludes(output, "## POST /users");
});

Deno.test("render Markdown includes parameter table", () => {
  const output = render(SINGLE_DOC, OutputFormat.Markdown);
  assertStringIncludes(output, "### Parameters");
  assertStringIncludes(output, "| page | query | integer | No | Page number |");
});

Deno.test("render Markdown includes request body section", () => {
  const output = render(SINGLE_DOC, OutputFormat.Markdown);
  assertStringIncludes(output, "### Request Body");
  assertStringIncludes(output, "application/json");
});

Deno.test("render Markdown includes response table", () => {
  const output = render(SINGLE_DOC, OutputFormat.Markdown);
  assertStringIncludes(output, "### Responses");
  assertStringIncludes(output, "| 200 | A JSON array of users |");
});

Deno.test("render HTML includes DOCTYPE and style tag", () => {
  const output = render(SINGLE_DOC, OutputFormat.HTML);
  assertStringIncludes(output, "<!DOCTYPE html>");
  assertStringIncludes(output, "<style>");
  assertStringIncludes(output, "</style>");
});

Deno.test("render HTML escapes special characters", () => {
  const doc: DocNode = {
    api: { title: "Test <script>alert('xss')</script>", version: "1.0" },
    endpoints: [{
      method: "GET",
      path: "/<bad>",
      summary: 'Dangerous "quotes" & ampersands',
      tags: [],
      parameters: [],
      responses: [{ status: "200", description: "OK" }],
    }],
  };
  const output = render(doc, OutputFormat.HTML);
  assertEquals(output.includes("<script>"), false);
  assertEquals(output.includes("&lt;script&gt;"), true);
});

Deno.test("render handles empty endpoints in all formats", () => {
  const md = render(EMPTY_DOC, OutputFormat.Markdown);
  const html = render(EMPTY_DOC, OutputFormat.HTML);
  const json = render(EMPTY_DOC, OutputFormat.JSON);
  assertEquals(md.includes("# Empty API"), true);
  assertEquals(html.includes("<!DOCTYPE html>"), true);
  assertEquals(typeof JSON.parse(json), "object");
});
