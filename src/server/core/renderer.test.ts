import { describe, it, expect } from "vitest";
import { render } from "./renderer.ts";
import { OutputFormat } from "../types/api_spec.ts";
import type { DocNode } from "../types/doc_node.ts";

const sampleDoc: DocNode = {
  api: { title: "Test API", version: "1.0", description: "A test description" },
  endpoints: [
    {
      method: "GET",
      path: "/users",
      summary: "Get all users",
      tags: ["users"],
      parameters: [
        { name: "limit", location: "query", type: "integer", required: false, description: "Max results" },
      ],
      responses: [{ status: "200", description: "Success", contentType: "application/json", type: "object" }],
    },
  ],
};

describe("render", () => {
  it("renders markdown format", () => {
    const md = render(sampleDoc, OutputFormat.Markdown);
    expect(md).toContain("# Test API");
    expect(md).toContain("## GET /users");
    expect(md).toContain("| limit | query | integer | No | Max results |");
    expect(md).toContain("> Version: 1.0");
    expect(md).toContain("> A test description");
  });

  it("renders HTML format", () => {
    const html = render(sampleDoc, OutputFormat.HTML);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Test API");
    expect(html).toContain('<span class="method get">GET</span>');
    expect(html).toContain("<code>/users</code>");
  });

  it("renders JSON format", () => {
    const json = render(sampleDoc, OutputFormat.JSON);
    const parsed = JSON.parse(json);
    expect(parsed.api.title).toBe("Test API");
    expect(parsed.endpoints).toHaveLength(1);
    expect(parsed.endpoints[0].method).toBe("GET");
  });

  it("markdown includes request body section when present", () => {
    const docWithBody: DocNode = {
      ...sampleDoc,
      endpoints: [{
        ...sampleDoc.endpoints[0],
        requestBody: { contentType: "application/json", type: "object", required: true, description: "User data" },
      }],
    };
    const md = render(docWithBody, OutputFormat.Markdown);
    expect(md).toContain("### Request Body");
    expect(md).toContain("**Content-Type**: application/json");
  });

  it("HTML escapes special characters", () => {
    const specialDoc: DocNode = {
      api: { title: "Test <API>", version: "1.0" },
      endpoints: [],
    };
    const html = render(specialDoc, OutputFormat.HTML);
    expect(html).toContain("Test &lt;API&gt;");
    expect(html).not.toContain("Test <API>");
  });
});
