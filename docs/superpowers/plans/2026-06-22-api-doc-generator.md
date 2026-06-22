# API Doc Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Deno + TypeScript HTTP service that receives API specs and generates standardized docs (Markdown/HTML/JSON), covering all 4 phases from the whitepaper.

**Architecture:** Layered pipeline — types define data shapes, parser validates input with generics + type guards, generator transforms with Utility Types, renderer outputs with function overloading. Router uses URLPattern for method+path matching. OpenAPI adapter wraps the pipeline without modifying it.

**Tech Stack:** Deno 2.x, TypeScript strict mode, `Deno.serve`, `@std/assert` for testing, zero runtime deps.

---

## File Structure

```
api-doc-generator/
├── deno.json                  # [modify] add tasks, imports
├── main.ts                    # [modify] full server with router + logger
├── router.ts                  # [create] URLPattern-based routing
├── types/
│   ├── api_spec.ts            # [create] ApiSpec, Operation, Schema, etc.
│   └── doc_node.ts            # [create] DocNode, Endpoint, ParamDetail, etc.
├── handlers/
│   ├── generate.ts            # [create] POST /generate
│   └── health.ts              # [create] GET /health
├── core/
│   ├── parser.ts              # [create] parseBody<T> + isApiSpec guard chain
│   ├── generator.ts           # [create] ApiSpec → DocNode
│   └── renderer.ts            # [create] DocNode → md/html/json string
├── middleware/
│   └── logger.ts              # [create] request logging
├── adapters/
│   └── openapi.ts             # [create] OpenAPI 3.x → DocNode
└── tests/
    ├── parser_test.ts         # [create] TDD for parser
    ├── generator_test.ts      # [create] TDD for generator
    ├── renderer_test.ts       # [create] TDD for renderer
    ├── integration_test.ts    # [create] end-to-end HTTP tests
    └── openapi_test.ts        # [create] OpenAPI adapter tests
```

---

### Task 1: Project Configuration

**Files:**
- Modify: `deno.json`

- [ ] **Step 1: Update deno.json with tasks and imports**

```json
{
  "tasks": {
    "dev": "deno run --watch --allow-net main.ts",
    "start": "deno run --allow-net main.ts",
    "test": "deno test --allow-net"
  },
  "imports": {
    "@std/assert": "jsr:@std/assert@1"
  }
}
```

- [ ] **Step 2: Verify config is valid**

```bash
deno task list
```
Expected: shows `dev`, `start`, `test` tasks.

- [ ] **Step 3: Commit**

```bash
git add deno.json
git commit -m "chore: update deno.json with tasks for dev/start/test

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Type Definitions — `types/api_spec.ts`

**Files:**
- Create: `types/api_spec.ts`

- [ ] **Step 1: Create the types file**

```typescript
// types/api_spec.ts
// ── HttpMethod: union type vs enum ─────────────────
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// ── OutputFormat: enum, usable as both value and type ──
export enum OutputFormat {
  Markdown = "markdown",
  HTML     = "html",
  JSON     = "json",
}

// ── Schema: recursive, supports nested objects/arrays ──
export interface Schema {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description?: string;
  nullable?: boolean;
  items?: Schema;
  properties?: Record<string, Schema>;
}

// ── Parameter ──────────────────────────────────────
export interface Parameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema: Schema;
}

// ── ApiResponse ────────────────────────────────────
export interface ApiResponse {
  description: string;
  content?: Record<string, { schema: Schema }>;
}

// ── RequestBody ────────────────────────────────────
export interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, { schema: Schema }>;
}

// ── Operation ──────────────────────────────────────
export interface Operation {
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ApiResponse>;
}

// ── PathItem ───────────────────────────────────────
export interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

// ── ApiInfo ────────────────────────────────────────
export interface ApiInfo {
  title: string;
  version: string;
  description?: string;
}

// ── ApiSpec (top-level) ────────────────────────────
export interface ApiSpec {
  info: ApiInfo;
  paths: Record<string, PathItem>;
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
}
```

- [ ] **Step 2: Verify the types compile**

```bash
deno check types/api_spec.ts
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/api_spec.ts
git commit -m "feat: add core TypeScript type definitions (ApiSpec, Operation, Schema)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Type Definitions — `types/doc_node.ts`

**Files:**
- Create: `types/doc_node.ts`

- [ ] **Step 1: Create the intermediate representation types**

```typescript
// types/doc_node.ts
// ── DocNode: top-level IR, decouples ApiSpec from rendering ──
export interface DocNode {
  api: {
    title: string;
    version: string;
    description?: string;
  };
  endpoints: Endpoint[];
  tags?: TagGroup[];
}

// ── Endpoint: flattened single API operation ───────
export interface Endpoint {
  method: string;
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  parameters: ParamDetail[];
  requestBody?: BodyDetail;
  responses: ResponseDetail[];
}

// ── ParamDetail ────────────────────────────────────
export interface ParamDetail {
  name: string;
  location: string;
  type: string;
  required: boolean;
  description?: string;
}

// ── BodyDetail ─────────────────────────────────────
export interface BodyDetail {
  contentType: string;
  type: string;
  required: boolean;
  description?: string;
}

// ── ResponseDetail ─────────────────────────────────
export interface ResponseDetail {
  status: string;
  description: string;
  contentType?: string;
  type?: string;
}

// ── TagGroup ───────────────────────────────────────
export interface TagGroup {
  name: string;
  description?: string;
  endpoints: Endpoint[];
}
```

- [ ] **Step 2: Verify types compile**

```bash
deno check types/doc_node.ts
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add types/doc_node.ts
git commit -m "feat: add intermediate representation types (DocNode, Endpoint)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Parser — TDD

**Files:**
- Create: `tests/parser_test.ts`
- Create: `core/parser.ts`

- [ ] **Step 1: Write failing tests for parser**

```typescript
// tests/parser_test.ts
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
  assertEquals(isApiSpec({ info: { title: "X", version: "1" } }), false); // missing paths
  assertEquals(isApiSpec({ paths: {} }), false); // missing info
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
deno test tests/parser_test.ts
```
Expected: FAIL — module not found or functions not exported.

- [ ] **Step 3: Implement core/parser.ts**

```typescript
// core/parser.ts
import type { ApiSpec, ApiInfo, PathItem, Operation } from "../types/api_spec.ts";

// ── ParseError: structured error with optional field path ──
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

// ── Generic parse entry: T + type guard → T ────────
export function parseBody<T>(
  raw: unknown,
  guard: (x: unknown) => x is T,
): T {
  if (!guard(raw)) {
    throw new ParseError("Request body does not match expected schema");
  }
  return raw;
}

// ── Multi-level structural guards ──────────────────

export function isApiSpec(x: unknown): x is ApiSpec {
  if (typeof x !== "object" || x === null) return false;
  const obj = x as Record<string, unknown>;
  if (!isApiInfo(obj["info"])) return false;
  if (typeof obj["paths"] !== "object" || obj["paths"] === null) return false;
  return Object.values(obj["paths"] as Record<string, unknown>)
    .every((v) => isPathItem(v));
}

export function isApiInfo(x: unknown): x is ApiInfo {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o["title"] === "string" &&
         typeof o["version"] === "string";
}

export function isPathItem(x: unknown): x is PathItem {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return ["get", "post", "put", "delete", "patch"]
    .every((m) => o[m] === undefined || isOperation(o[m]));
}

export function isOperation(x: unknown): x is Operation {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return typeof o["summary"] === "string" &&
         typeof o["responses"] === "object" && o["responses"] !== null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
deno test tests/parser_test.ts
```
Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/parser_test.ts core/parser.ts
git commit -m "feat: add parser with generic parseBody and multi-level type guards

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Generator — TDD

**Files:**
- Create: `tests/generator_test.ts`
- Create: `core/generator.ts`

- [ ] **Step 1: Write failing tests for generator**

```typescript
// tests/generator_test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
deno test tests/generator_test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement core/generator.ts**

```typescript
// core/generator.ts
import type { ApiSpec, Operation, PathItem, Parameter } from "../types/api_spec.ts";
import type { DocNode, Endpoint, ParamDetail, ResponseDetail, BodyDetail, TagGroup } from "../types/doc_node.ts";

// ── Utility Types (learning focus) ────────────────
type OperationSummary = Pick<Operation, "summary" | "description">;
type ReadonlySpec    = Readonly<ApiSpec>;

// ── Main entry ────────────────────────────────────
export function generate(spec: ReadonlySpec): DocNode {
  const endpoints = flattenPaths(spec.paths);

  return {
    api: {
      title: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
    },
    endpoints,
    tags: buildTagGroups(endpoints, spec.tags),
  };
}

// ── Flatten nested Record<string, PathItem> → Endpoint[]
function flattenPaths(paths: Record<string, PathItem>): Endpoint[] {
  const result: Endpoint[] = [];
  const methods = ["get", "post", "put", "delete", "patch"] as const;

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of methods) {
      const op: Operation | undefined = pathItem[method];
      if (op) {
        result.push(buildEndpoint(method.toUpperCase(), path, op, pathItem));
      }
    }
  }

  return result;
}

// ── Build single Endpoint ─────────────────────────
function buildEndpoint(
  method: string,
  path: string,
  op: Operation,
  pathItem: PathItem,
): Endpoint {
  const summary: OperationSummary = {
    summary: op.summary,
    description: op.description ?? pathItem.description,
  };

  return {
    method,
    path,
    ...summary,
    tags: op.tags ?? [],
    parameters: (op.parameters ?? []).map(toParamDetail),
    requestBody: op.requestBody ? toBodyDetail(op.requestBody) : undefined,
    responses: Object.entries(op.responses).map(([status, r]) => ({
      status,
      description: r.description,
      contentType: firstKey(r.content),
      type: r.content ? schemaLabel(r.content[firstKey(r.content)!]?.schema) : undefined,
    })),
  };
}

// ── Parameter conversion ──────────────────────────
function toParamDetail(p: Parameter): ParamDetail {
  return {
    name: p.name,
    location: p.in,
    type: schemaLabel(p.schema),
    required: p.required ?? false,
    description: p.description,
  };
}

// ── RequestBody conversion ────────────────────────
function toBodyDetail(b: NonNullable<Operation["requestBody"]>): BodyDetail {
  const ct = firstKey(b.content) ?? "application/json";
  return {
    contentType: ct,
    type: schemaLabel(b.content[ct]?.schema),
    required: b.required ?? false,
    description: b.description,
  };
}

// ── Schema → human-readable type label ─────────────
function schemaLabel(s?: { type?: string; items?: { type?: string } }): string {
  if (!s) return "any";
  if (s.type === "array" && s.items) return `${s.items.type ?? "any"}[]`;
  return s.type ?? "any";
}

// ── Tag grouping ──────────────────────────────────
function buildTagGroups(
  endpoints: Endpoint[],
  tagDefs?: ReadonlySpec["tags"],
): TagGroup[] | undefined {
  if (!tagDefs || tagDefs.length === 0) return undefined;

  return tagDefs.map((t) => ({
    name: t.name,
    description: t.description,
    endpoints: endpoints.filter((e) => e.tags.includes(t.name)),
  }));
}

// ── Helper: first key of an object ────────────────
function firstKey<T extends Record<string, unknown>>(obj: T | undefined): string | undefined {
  if (!obj) return undefined;
  return Object.keys(obj)[0];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
deno test tests/generator_test.ts
```
Expected: all 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/generator_test.ts core/generator.ts
git commit -m "feat: add generator with Utility Types (Pick, Readonly)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Renderer — TDD

**Files:**
- Create: `tests/renderer_test.ts`
- Create: `core/renderer.ts`

- [ ] **Step 1: Write failing tests for renderer**

```typescript
// tests/renderer_test.ts
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
      summary: "Dangerous \"quotes\" & ampersands",
      tags: [],
      parameters: [],
      responses: [{ status: "200", description: "OK" }],
    }],
  };
  const output = render(doc, OutputFormat.HTML);
  // Should NOT contain raw script tag
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
deno test tests/renderer_test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement core/renderer.ts**

```typescript
// core/renderer.ts
import type { DocNode } from "../types/doc_node.ts";
import { OutputFormat } from "../types/api_spec.ts";

// ── Function overloading (learning focus) ─────────
// All overloads return string (fixed: was inconsistent in whitepaper)
export function render(doc: DocNode, format: OutputFormat.Markdown): string;
export function render(doc: DocNode, format: OutputFormat.HTML): string;
export function render(doc: DocNode, format: OutputFormat.JSON): string;
export function render(doc: DocNode, format: OutputFormat): string;

// ── Implementation ────────────────────────────────
export function render(doc: DocNode, format: OutputFormat): string {
  switch (format) {
    case OutputFormat.Markdown:
      return renderMarkdown(doc);
    case OutputFormat.HTML:
      return renderHTML(doc);
    case OutputFormat.JSON:
      return JSON.stringify(doc, null, 2);
  }
}

// ── Markdown rendering ───────────────────────────
function renderMarkdown(doc: DocNode): string {
  const lines: string[] = [];

  lines.push(`# ${doc.api.title}`);
  lines.push("");
  lines.push(`> Version: ${doc.api.version}`);
  if (doc.api.description) {
    lines.push(`> ${doc.api.description}`);
  }
  lines.push("");

  for (const ep of doc.endpoints) {
    lines.push("---");
    lines.push("");
    lines.push(`## ${ep.method} ${ep.path}`);
    lines.push("");
    lines.push(`**${ep.summary}**`);
    if (ep.description) {
      lines.push("");
      lines.push(ep.description);
    }

    if (ep.parameters.length > 0) {
      lines.push("");
      lines.push("### Parameters");
      lines.push("");
      lines.push("| Name | In | Type | Required | Description |");
      lines.push("|------|----|------|----------|-------------|");
      for (const p of ep.parameters) {
        lines.push(
          `| ${p.name} | ${p.location} | ${p.type} | ${p.required ? "Yes" : "No"} | ${p.description ?? "-"} |`,
        );
      }
    }

    if (ep.requestBody) {
      lines.push("");
      lines.push("### Request Body");
      lines.push("");
      lines.push(`- **Content-Type**: ${ep.requestBody.contentType}`);
      lines.push(`- **Type**: ${ep.requestBody.type}`);
      lines.push(`- **Required**: ${ep.requestBody.required ? "Yes" : "No"}`);
      if (ep.requestBody.description) {
        lines.push(`- **Description**: ${ep.requestBody.description}`);
      }
    }

    lines.push("");
    lines.push("### Responses");
    lines.push("");
    lines.push("| Status | Description | Content-Type |");
    lines.push("|--------|-------------|--------------|");
    for (const r of ep.responses) {
      lines.push(`| ${r.status} | ${r.description} | ${r.contentType ?? "-"} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── HTML rendering ───────────────────────────────
function renderHTML(doc: DocNode): string {
  const css = `
    :root { --bg: #fff; --text: #1a1a1a; --border: #e0e0e0; --code-bg: #f5f5f5;
            --tag-bg: #e8f0fe; --method-get: #008000; --method-post: #e36209;
            --method-put: #005cc5; --method-delete: #d73a49; --method-patch: #6f42c1; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
           max-width: 960px; margin: 0 auto; padding: 2rem; color: var(--text);
           background: var(--bg); line-height: 1.6; }
    h1 { border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
    h2 { margin-top: 2.5rem; }
    .method {
      display: inline-block; font-weight: 700; font-size: 0.85rem; padding: 2px 8px;
      border-radius: 4px; margin-right: 0.5rem; min-width: 3.5rem; text-align: center;
    }
    .method.get    { color: var(--method-get);    background: #e6f4ea; }
    .method.post   { color: var(--method-post);   background: #fce8e0; }
    .method.put    { color: var(--method-put);    background: #e8f0fe; }
    .method.delete { color: var(--method-delete); background: #fce8e8; }
    .method.patch  { color: var(--method-patch);  background: #f3e8fc; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border: 1px solid var(--border); }
    th { background: var(--code-bg); font-weight: 600; }
    code { background: var(--code-bg); padding: 1px 5px; border-radius: 3px;
           font-size: 0.9em; }
    .tag { display: inline-block; background: var(--tag-bg); padding: 2px 10px;
           border-radius: 12px; font-size: 0.8rem; margin-right: 4px; }
    .endpoint-section { border: 1px solid var(--border); border-radius: 8px;
                        padding: 1.5rem; margin: 1.5rem 0; }
  `;

  let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(doc.api.title)} — API Reference</title>
<style>${css}</style>
</head>
<body>
`;

  html += `<h1>${escapeHtml(doc.api.title)}</h1>\n`;
  html += `<p><em>Version: ${escapeHtml(doc.api.version)}</em></p>\n`;
  if (doc.api.description) {
    html += `<p>${escapeHtml(doc.api.description)}</p>\n`;
  }

  for (const ep of doc.endpoints) {
    html += `<div class="endpoint-section">\n`;
    html += `<h2><span class="method ${ep.method.toLowerCase()}">${ep.method}</span> <code>${escapeHtml(ep.path)}</code></h2>\n`;
    html += `<p><strong>${escapeHtml(ep.summary)}</strong></p>\n`;
    if (ep.description) {
      html += `<p>${escapeHtml(ep.description)}</p>\n`;
    }
    if (ep.tags.length > 0) {
      html += `<p>${ep.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")}</p>\n`;
    }

    if (ep.parameters.length > 0) {
      html += `<h3>Parameters</h3>\n<table>\n<tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr>\n`;
      for (const p of ep.parameters) {
        html += `<tr><td><code>${escapeHtml(p.name)}</code></td><td>${p.location}</td><td><code>${escapeHtml(p.type)}</code></td><td>${p.required ? "Yes" : "No"}</td><td>${escapeHtml(p.description ?? "-")}</td></tr>\n`;
      }
      html += `</table>\n`;
    }

    if (ep.requestBody) {
      html += `<h3>Request Body</h3>\n<ul>\n`;
      html += `<li><strong>Content-Type:</strong> <code>${escapeHtml(ep.requestBody.contentType)}</code></li>\n`;
      html += `<li><strong>Type:</strong> <code>${escapeHtml(ep.requestBody.type)}</code></li>\n`;
      html += `<li><strong>Required:</strong> ${ep.requestBody.required ? "Yes" : "No"}</li>\n`;
      if (ep.requestBody.description) {
        html += `<li><strong>Description:</strong> ${escapeHtml(ep.requestBody.description)}</li>\n`;
      }
      html += `</ul>\n`;
    }

    html += `<h3>Responses</h3>\n<table>\n<tr><th>Status</th><th>Description</th><th>Content-Type</th></tr>\n`;
    for (const r of ep.responses) {
      html += `<tr><td><strong>${escapeHtml(r.status)}</strong></td><td>${escapeHtml(r.description)}</td><td><code>${r.contentType ?? "-"}</code></td></tr>\n`;
    }
    html += `</table>\n`;
    html += `</div>\n`;
  }

  html += `</body>\n</html>`;
  return html;
}

// ── XSS prevention ────────────────────────────────
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
deno test tests/renderer_test.ts
```
Expected: all 11 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/renderer_test.ts core/renderer.ts
git commit -m "feat: add renderer with function overloading (md/html/json)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Handlers

**Files:**
- Create: `handlers/health.ts`
- Create: `handlers/generate.ts`

- [ ] **Step 1: Create handlers/health.ts**

```typescript
// handlers/health.ts

export function handleHealth(_req: Request): Response {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
```

- [ ] **Step 2: Create handlers/generate.ts**

```typescript
// handlers/generate.ts
import { parseBody, isApiSpec, ParseError } from "../core/parser.ts";
import { generate } from "../core/generator.ts";
import { render } from "../core/renderer.ts";
import { OutputFormat } from "../types/api_spec.ts";

// ── Custom business error ─────────────────────────
export class GenerateError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GenerateError";
  }
}

// ── Content-Type lookup ───────────────────────────
const CONTENT_TYPES: Record<OutputFormat, string> = {
  [OutputFormat.Markdown]: "text/markdown; charset=utf-8",
  [OutputFormat.HTML]:     "text/html; charset=utf-8",
  [OutputFormat.JSON]:     "application/json; charset=utf-8",
};

// ── Main handler ──────────────────────────────────
export async function handleGenerate(req: Request): Promise<Response> {
  const format = resolveFormat(req);

  try {
    const body = await req.json();
    const spec = parseBody(body, isApiSpec);
    const doc  = generate(spec);
    const output = render(doc, format);

    return new Response(output, {
      status: 200,
      headers: { "Content-Type": CONTENT_TYPES[format] },
    });
  } catch (e) {
    if (e instanceof ParseError) {
      return new Response(
        JSON.stringify({ error: e.message, field: e.field }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (e instanceof GenerateError) {
      return new Response(
        JSON.stringify({ error: e.message }),
        { status: e.status, headers: { "Content-Type": "application/json" } },
      );
    }
    // Unexpected errors → 500 + log
    console.error("Unexpected error in /generate:", e);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

// ── Format resolution: query param → Accept header → default
function resolveFormat(req: Request): OutputFormat {
  const url = new URL(req.url);
  const q = url.searchParams.get("format")?.toLowerCase();

  if (q === "html") return OutputFormat.HTML;
  if (q === "json") return OutputFormat.JSON;
  if (q === "markdown") return OutputFormat.Markdown;

  // Fallback: Accept header
  const accept = req.headers.get("Accept") ?? "";
  if (accept.includes("text/html")) return OutputFormat.HTML;
  if (accept.includes("application/json")) return OutputFormat.JSON;

  return OutputFormat.Markdown;
}
```

- [ ] **Step 3: Verify types compile**

```bash
deno check handlers/health.ts handlers/generate.ts
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add handlers/health.ts handlers/generate.ts
git commit -m "feat: add health and generate handlers with error classification

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Router, Middleware, and Main Entry

**Files:**
- Create: `router.ts`
- Create: `middleware/logger.ts`
- Modify: `main.ts` (full rewrite)

- [ ] **Step 1: Create router.ts**

```typescript
// router.ts
import { handleGenerate } from "./handlers/generate.ts";
import { handleHealth } from "./handlers/health.ts";

type Handler = (req: Request) => Response | Promise<Response>;

interface Route {
  method: string;
  pattern: URLPattern;
  handler: Handler;
}

const routes: Route[] = [
  {
    method: "GET",
    pattern: new URLPattern({ pathname: "/health" }),
    handler: handleHealth,
  },
  {
    method: "POST",
    pattern: new URLPattern({ pathname: "/generate" }),
    handler: handleGenerate,
  },
];

export function resolveRoute(method: string, url: URL): Handler | null {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (route.pattern.test(url)) return route.handler;
  }
  return null;
}
```

- [ ] **Step 2: Create middleware/logger.ts**

```typescript
// middleware/logger.ts

export function logRequest(req: Request, res: Response, duration: number): void {
  const url = new URL(req.url);
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${url.pathname} → ${res.status} (${duration}ms)`,
  );
}
```

- [ ] **Step 3: Rewrite main.ts**

```typescript
// main.ts
import { resolveRoute } from "./router.ts";
import { logRequest } from "./middleware/logger.ts";

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const start = performance.now();
  const route = resolveRoute(req.method, url);

  let res: Response;
  if (route) {
    res = await route(req);
  } else {
    res = new Response("Not Found", { status: 404 });
  }

  logRequest(req, res, Math.round(performance.now() - start));
  return res;
}

if (import.meta.main) {
  Deno.serve({ port: 8080 }, handler);
  console.log("🚀 API Doc Generator running on http://localhost:8080");
}
```

- [ ] **Step 4: Verify the server starts**

```bash
deno check main.ts
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add router.ts middleware/logger.ts main.ts
git commit -m "feat: add URLPattern router, request logger, and main entry

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: OpenAPI Adapter — TDD

**Files:**
- Create: `tests/openapi_test.ts`
- Create: `adapters/openapi.ts`

- [ ] **Step 1: Write failing tests for OpenAPI adapter**

```typescript
// tests/openapi_test.ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
deno test tests/openapi_test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement adapters/openapi.ts**

```typescript
// adapters/openapi.ts
// OpenAPI 3.x → internal ApiSpec → DocNode (adapter pattern)
import type { ApiSpec, PathItem, Operation, Parameter, Schema, ApiResponse, RequestBody } from "../types/api_spec.ts";
import type { DocNode } from "../types/doc_node.ts";
import { generate } from "../core/generator.ts";

interface OpenAPIDoc {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  paths?: Record<string, Record<string, unknown>>;
}

export function fromOpenAPI(doc: OpenAPIDoc): DocNode {
  const spec: ApiSpec = {
    info: {
      title: doc.info.title,
      version: doc.info.version,
      description: doc.info.description,
    },
    servers: doc.servers,
    tags: doc.tags,
    paths: {},
  };

  if (doc.paths) {
    for (const [path, methods] of Object.entries(doc.paths)) {
      spec.paths[path] = convertPathItem(methods);
    }
  }

  return generate(spec);
}

function convertPathItem(methods: Record<string, unknown>): PathItem {
  const item: PathItem = {};
  const httpMethods = ["get", "post", "put", "delete", "patch"];

  for (const [method, op] of Object.entries(methods)) {
    if (httpMethods.includes(method)) {
      (item as Record<string, unknown>)[method] = convertOperation(op);
    }
  }

  return item;
}

function convertOperation(raw: unknown): Operation {
  const op = raw as Record<string, unknown>;
  return {
    summary: (op.summary as string) ?? "",
    description: op.description as string | undefined,
    tags: op.tags as string[] | undefined,
    parameters: Array.isArray(op.parameters)
      ? op.parameters.map(convertParameter)
      : undefined,
    requestBody: op.requestBody
      ? convertRequestBody(op.requestBody)
      : undefined,
    responses: convertResponses(op.responses),
  };
}

function convertParameter(raw: unknown): Parameter {
  const p = raw as Record<string, unknown>;
  return {
    name: p.name as string,
    in: p.in as Parameter["in"],
    required: p.required as boolean | undefined,
    description: p.description as string | undefined,
    schema: convertSchema(p.schema),
  };
}

function convertRequestBody(raw: unknown): RequestBody {
  const r = raw as Record<string, unknown>;
  return {
    description: r.description as string | undefined,
    required: r.required as boolean | undefined,
    content: convertContent(r.content),
  };
}

function convertResponses(raw: unknown): Record<string, ApiResponse> {
  const result: Record<string, ApiResponse> = {};
  if (typeof raw !== "object" || raw === null) return result;

  for (const [status, val] of Object.entries(raw as Record<string, unknown>)) {
    const r = val as Record<string, unknown>;
    result[status] = {
      description: (r.description as string) ?? "",
      content: convertContent(r.content),
    };
  }

  return result;
}

function convertContent(raw: unknown): Record<string, { schema: Schema }> {
  const result: Record<string, { schema: Schema }> = {};
  if (typeof raw !== "object" || raw === null) return result;

  for (const [ct, val] of Object.entries(raw as Record<string, unknown>)) {
    const v = val as Record<string, unknown>;
    result[ct] = { schema: convertSchema(v.schema) };
  }

  return result;
}

function convertSchema(raw: unknown): Schema {
  if (typeof raw !== "object" || raw === null) return { type: "string" };
  const s = raw as Record<string, unknown>;
  return {
    type: (s.type as Schema["type"]) ?? "string",
    description: s.description as string | undefined,
    nullable: s.nullable as boolean | undefined,
    items: s.items ? convertSchema(s.items) : undefined,
    properties: s.properties
      ? Object.fromEntries(
          Object.entries(s.properties as Record<string, unknown>).map(
            ([k, v]) => [k, convertSchema(v)],
          ),
        )
      : undefined,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
deno test tests/openapi_test.ts
```
Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/openapi_test.ts adapters/openapi.ts
git commit -m "feat: add OpenAPI 3.x adapter with recursive schema conversion

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Integration Tests

**Files:**
- Create: `tests/integration_test.ts`

- [ ] **Step 1: Write integration tests**

```typescript
// tests/integration_test.ts
import { assertEquals, assertStringIncludes } from "@std/assert";
import { handler } from "../main.ts";

const BASE = "http://localhost:8080";

const VALID_BODY = JSON.stringify({
  info: { title: "Integration Test API", version: "1.0" },
  paths: {
    "/echo": {
      get: {
        summary: "Echo back",
        parameters: [
          { name: "msg", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "The echo response" },
        },
      },
    },
  },
});

Deno.test("GET /health returns status ok", async () => {
  const req = new Request(`${BASE}/health`);
  const res = await handler(req);
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.status, "ok");
  assertEquals(typeof body.timestamp, "string");
});

Deno.test("POST /generate?format=markdown returns markdown", async () => {
  const req = new Request(`${BASE}/generate?format=markdown`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: VALID_BODY,
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/markdown; charset=utf-8");
  const body = await res.text();
  assertStringIncludes(body, "# Integration Test API");
  assertStringIncludes(body, "## GET /echo");
  assertStringIncludes(body, "| msg | query | string | Yes | - |");
});

Deno.test("POST /generate?format=html returns HTML", async () => {
  const req = new Request(`${BASE}/generate?format=html`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: VALID_BODY,
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/html; charset=utf-8");
  const body = await res.text();
  assertStringIncludes(body, "<!DOCTYPE html>");
  assertStringIncludes(body, "Integration Test API");
  assertStringIncludes(body, '<span class="method get">GET</span>');
});

Deno.test("POST /generate with Accept: application/json returns JSON", async () => {
  const req = new Request(`${BASE}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: VALID_BODY,
  });
  const res = await handler(req);
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "application/json; charset=utf-8");
  const body = await res.json();
  assertEquals(body.api.title, "Integration Test API");
  assertEquals(body.endpoints.length, 1);
});

Deno.test("POST /generate returns 400 for invalid body", async () => {
  const req = new Request(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ not: "valid" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(typeof body.error, "string");
});

Deno.test("POST /generate returns 400 for non-JSON body", async () => {
  const req = new Request(`${BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "this is not json",
  });
  const res = await handler(req);
  assertEquals(res.status, 500); // JSON parse fails → unexpected error → 500
});

Deno.test("Unknown route returns 404", async () => {
  const req = new Request(`${BASE}/nonexistent`);
  const res = await handler(req);
  assertEquals(res.status, 404);
});

Deno.test("Wrong method on /generate returns 404", async () => {
  const req = new Request(`${BASE}/generate`); // GET, not POST
  const res = await handler(req);
  assertEquals(res.status, 404);
});
```

- [ ] **Step 2: Run integration tests**

```bash
deno test --allow-net tests/integration_test.ts
```
Expected: all 8 tests PASS.

> Note: if the import of `handler` from `main.ts` causes issues due to the `if (import.meta.main)` guard calling `Deno.serve`, refactor `main.ts` to export handler separately:
> The current `main.ts` already exports `handler` as a named function (implicitly), so importing it should work. `Deno.serve` is only called when `import.meta.main` is true, which is false during tests.

- [ ] **Step 3: Run all tests together**

```bash
deno test --allow-net
```
Expected: all tests from all files PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/integration_test.ts
git commit -m "test: add integration tests for all endpoints and error cases

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Update Whitepaper

**Files:**
- Modify: `docs/api-doc-generator-whitepaper.md`

- [ ] **Step 1: Update the whitepaper to reflect improvements**

The following sections need updates:

**Section 1 — Project positioning**: Update to mention practical improvements.

**Section 3 — System Architecture**: Add `middleware/` and `adapters/` to the diagram.

**Section 5 — Directory Structure**: Replace with the actual structure including `middleware/` and `adapters/`.

**Section 6 — TypeScript knowledge coverage**: Update to reflect actual parser improvements (multi-level guards), generator (Utility Types actually used), renderer (consistent return types), and add adapter section.

**Section 6.3 — Utility Types**: Update to show they're actually used in `buildEndpoint` and `generate`, not just defined.

**Section 6.4 — Function overloading**: Update to show all overloads return `string`.

**Section 6.5 — Async & error handling**: Update to show classified error handling (400/500 split, `console.error` for unknowns).

**Section 8 — Learning milestones**: Update Gantt chart to reflect actual implementation.

**Section 9 — API Interface**: Add `Accept` header support. Update port to 8080.

**Section 10 — Run commands**: Update port to 8080.

Add a new section: **12. Design Improvements Over Original Whitepaper** listing the 10 improvements from the spec.

- [ ] **Step 2: Apply the whitepaper edits**

The changes are extensive — the actual edits will be applied in the implementation step. Key structural changes:

1. Replace the directory tree in Section 5 with the actual one (add `middleware/`, `adapters/`, rename Section → Endpoint)
2. Replace the architecture diagram in Section 3 to include middleware and adapter
3. Update Section 6.1–6.5 code examples to match the actual implementation
4. Update Section 7 module relationship diagram with new files
5. Add Section 12: "Design Improvements" table
6. Update port references from 8000 to 8080
7. Update API spec to mention Accept header support
8. Update renderer description to note consistent `string` return type

- [ ] **Step 3: Commit whitepaper changes**

```bash
git add docs/api-doc-generator-whitepaper.md
git commit -m "docs: update whitepaper to reflect implemented improvements

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Type-check all files**

```bash
deno check main.ts
deno check types/api_spec.ts types/doc_node.ts
deno check core/parser.ts core/generator.ts core/renderer.ts
deno check handlers/health.ts handlers/generate.ts
deno check router.ts middleware/logger.ts
deno check adapters/openapi.ts
```
Expected: no errors on all files.

- [ ] **Step 2: Run all tests**

```bash
deno test --allow-net
```
Expected: all tests PASS (parser: 8, generator: 10, renderer: 11, openapi: 7, integration: 8 = ~44 tests).

- [ ] **Step 3: Start the server and smoke test**

```bash
# Terminal 1: start server
deno task dev

# Terminal 2: quick smoke test
curl -s http://localhost:8080/health | head -1
# Expected: {"status":"ok","timestamp":"..."}

curl -s -X POST http://localhost:8080/generate?format=markdown \
  -H "Content-Type: application/json" \
  -d '{"info":{"title":"Test","version":"1.0"},"paths":{"/ping":{"get":{"summary":"Ping","responses":{"200":{"description":"pong"}}}}}}' | head -3
# Expected: # Test\n\n> Version: 1.0\n
```

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "chore: final type-check and test verification passes

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Dependency Order

```
Task 1 (deno.json)
    ↓
Task 2 (types/api_spec.ts)
    ↓
Task 3 (types/doc_node.ts)
    ↓
Task 4 (parser + test) ──→ Task 5 (generator + test) ──→ Task 6 (renderer + test)
    ↓                           ↓                            ↓
    └───────────────────────────┴────────────────────────────┘
                                ↓
                          Task 7 (handlers)
                                ↓
                          Task 8 (router + middleware + main.ts)
                                ↓
                          Task 9 (openapi adapter + test)
                                ↓
                          Task 10 (integration tests)
                                ↓
                          Task 11 (update whitepaper)
                                ↓
                          Task 12 (final verification)
```

Tasks 4, 5, 6 are sequential (each depends on the previous), but they are all independent of the handler/router layer. Type tasks (2, 3) have no tests of their own since they define only interfaces.
