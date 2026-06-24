# API Doc Generator — 白皮书

> 一个基于 Deno + TypeScript 的全栈 API 文档生成器
> 目标：以项目驱动学习，系统掌握 TypeScript 核心语法、Deno 生态与 AI 应用开发

---

## 1. 项目定位

`api-doc-generator` 是一个全栈 HTTP 服务，接收 API 接口的结构化输入或自然语言描述，自动生成标准化的接口文档（Markdown / HTML / JSON），并支持通过 AI 从零生成 OpenAPI 规范。

项目的双重学习目标：

1. **TypeScript 工程化** — 刻意覆盖 TS 最核心的语言特性：类型系统、泛型、类型守卫、函数重载、模块化，以及与 Deno 标准库的协作方式
2. **AI 应用开发** — 通过 LLM Client 封装、Provider 抽象、JSON Schema 结构化输出、SSE 流式响应等实战，掌握 AI 工程化的核心技术

---

## 2. 技术选型

| 维度 | 选择 | 原因 |
|---|---|---|
| 运行时 | Deno 2.x | 原生 TS 支持，无需 webpack/tsc 配置；内置标准库 |
| 语言 | TypeScript (strict mode) | 项目核心学习目标 |
| HTTP 框架 | Deno 内置 `Deno.serve` | 零依赖，感受最原始的请求/响应模型 |
| 前端 | React 18 + Tailwind CSS | Vite 构建，组件化 SPA |
| AI/LLM | OpenAI-compatible API | Provider 抽象，支持任意兼容接口的 LLM |
| 测试 | `deno test` | 内置断言库，无额外配置 |
| 包管理 | `deno.json` imports | 替代 npm，用 URL/JSR 引入依赖 |

---

## 3. 系统架构

```mermaid
graph TD
    Client["Client (browser / curl)"]
    Server["Deno HTTP Server\nmain.ts"]
    Middleware["Middleware\nmiddleware/"]
    Router["Router\nrouter.ts"]
    Handler["Handler Layer\nhandlers/"]
    Parser["RequestParser\nparser.ts"]
    Generator["DocGenerator\ngenerator.ts"]
    Adapter["OpenAPI Adapter\nadapters/"]
    Renderer["Renderer\nrenderer.ts"]
    AIHandler["AI Handler\nhandlers/ai.ts"]
    LLMClient["LLMClient\ngenai/client.ts"]
    Provider["ChatCompletions\nProvider"]
    Schema["JSON Schemas\ngenai/schemas/"]
    Frontend["React SPA\nfrontend/"]

    Client -->|HTTP Request| Server
    Client -->|SPA| Frontend
    Frontend -->|POST /generate| Server
    Frontend -->|POST /ai/*| Server
    Server --> Middleware
    Middleware --> Router
    Router -->|/generate| Handler
    Router -->|/ai/*| AIHandler
    Handler --> Parser
    Parser -->|ApiSpec TS interface| Generator
    Adapter -->|OpenAPI → ApiSpec| Generator
    Generator --> Renderer
    AIHandler --> LLMClient
    LLMClient --> Provider
    Provider -->|LLM API| Schema
    Renderer -->|Response| Client
```

---

## 4. 核心数据流

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server (main.ts)
    participant P as Parser
    participant G as Generator
    participant R as Renderer

    C->>S: POST /generate\n{ paths, components, info }
    S->>P: parse(request.body)
    P-->>S: ApiSpec (typed)
    S->>G: generate(ApiSpec)
    G-->>S: DocNode[]
    S->>R: render(DocNode[], format)
    R-->>S: string (md/html/json)
    S-->>C: 200 OK + content
```

---

## 5. 目录结构

```
api-doc-generator/
├── backend/
│   ├── deno.json
│   ├── main.ts
│   ├── router.ts
│   ├── types/
│   │   ├── api_spec.ts
│   │   └── doc_node.ts
│   ├── handlers/
│   │   ├── generate.ts
│   │   ├── health.ts
│   │   ├── openapi.ts
│   │   └── ai.ts
│   ├── core/
│   │   ├── parser.ts
│   │   ├── generator.ts
│   │   └── renderer.ts
│   ├── middleware/
│   │   └── logger.ts
│   ├── adapters/
│   │   └── openapi.ts
│   └── tests/
│       ├── parser_test.ts
│       ├── generator_test.ts
│       ├── renderer_test.ts
│       ├── integration_test.ts
│       └── openapi_test.ts
├── genai/
│   ├── client.ts              # LLMClient 封装
│   ├── types.ts               # Provider 接口定义
│   ├── errors.ts              # LLMError 错误分类
│   ├── openapi.ts             # OpenAPI 生成器
│   ├── index.ts               # 公共导出
│   ├── providers/
│   │   └── chat_completions.ts # OpenAI-compatible Provider
│   ├── schemas/
│   │   ├── endpoint.ts        # 单端点 JSON Schema
│   │   └── document.ts        # 完整文档 JSON Schema
│   └── tests/
│       ├── client_test.ts
│       └── openapi_test.ts
├── frontend/
│   └── src/
│       ├── components/        # React 组件
│       ├── api/               # API 客户端
│       └── utils/             # 工具函数
└── docs/
    └── api-doc-generator-whitepaper.md
```

---

## 6. TypeScript 核心知识点覆盖

本项目按模块刻意安排了不同的 TS 特性，确保学习路径连贯：

### 6.1 类型系统基础（`types/api_spec.ts`）

```typescript
// interface vs type alias 的选择
interface Operation {
  summary: string;
  description?: string;          // 可选属性
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>; // 索引签名
}

// 字面量联合类型
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// 枚举（对比 union type 的适用场景）
enum OutputFormat {
  Markdown = "markdown",
  HTML     = "html",
  JSON     = "json",
}
```

**学习重点**：`interface` 与 `type` 的差异；可选 vs 必选；`Record<K,V>` 的语义。

---

### 6.2 泛型（`core/parser.ts`）

```typescript
// 泛型函数：解析 + 类型守卫组合
function parseBody<T>(raw: unknown, guard: (x: unknown) => x is T): T {
  if (!guard(raw)) {
    throw new TypeError("Request body does not match expected schema");
  }
  return raw;
}

// 类型守卫（Type Guard）
function isApiSpec(x: unknown): x is ApiSpec {
  return (
    typeof x === "object" &&
    x !== null &&
    "info" in x &&
    "paths" in x
  );
}
```

**学习重点**：`<T>` 语法；`is` 类型谓词；`unknown` vs `any` 的正确使用姿势。

---

### 6.3 Utility Types（`core/generator.ts`）

```typescript
// Partial / Required / Readonly / Pick / Omit 的实际应用
// (在 core/generator.ts 中实际使用)
type OperationSummary = Pick<Operation, "summary" | "description">;
type ReadonlySpec    = Readonly<ApiSpec>;
// buildEndpoint 使用 OperationSummary 提取字段
// generate 函数参数使用 Readonly<ApiSpec>

// 条件类型
type Flatten<T> = T extends Array<infer Item> ? Item : T;
// Flatten<string[]>  → string
// Flatten<number>    → number
```

---

### 6.4 函数重载（`core/renderer.ts`）

```typescript
// 重载签名（改进：所有重载统一返回 string）
function render(nodes: DocNode[], format: "markdown"): string;
function render(nodes: DocNode[], format: "html"):     string;
function render(nodes: DocNode[], format: "json"):     string;

// 实现签名
function render(nodes: DocNode[], format: OutputFormat): string {
  switch (format) {
    case "markdown": return renderMarkdown(nodes);
    case "html":     return renderHTML(nodes);
    case "json":     return renderJSON(nodes);
  }
}
```

---

### 6.5 异步与错误处理（`handlers/generate.ts`）

```typescript
export async function handleGenerate(req: Request): Promise<Response> {
  try {
    // ... parse, generate, render
    return new Response(output, { status: 200, headers: { ... } });
  } catch (e) {
    if (e instanceof ParseError) {
      return new Response(..., { status: 400 });  // 精确到字段
    }
    if (e instanceof GenerateError) {
      return new Response(..., { status: e.status });
    }
    console.error("Unexpected error:", e);
    return new Response(..., { status: 500 });     // 真·内部错误
  }
}
```

---

## 7. AI 开发知识点覆盖

AI 模块 (`genai/`) 是本项目的第二核心学习目标。通过构建一个完整的 LLM 接入层，掌握以下 AI 工程化技能：

### 7.1 Provider 抽象模式（`genai/types.ts`）

```typescript
// 面向接口编程：上层 LLMClient 只依赖 Provider 接口
export interface Provider {
  chat(req: ChatRequest): Promise<ChatResponse>;
  streamChat?(req: ChatRequest): Promise<ReadableStream<string>>;
}

// 学习重点：依赖倒置原则 (DIP)
// LLMClient → Provider 接口 ← ChatCompletionsProvider
// 新增 LLM 后端只需实现 Provider，无需修改客户端代码
```

**学习重点**：接口抽象、依赖倒置、可测试性设计（mock provider 即可单测）。

---

### 7.2 LLMClient 封装（`genai/client.ts`）

```typescript
export class LLMClient {
  constructor(private provider: Provider) {}

  async complete(req: ChatRequest): Promise<ChatResponse> {
    this.validate(req);  // 请求验证，避免浪费 API 调用
    return await this.provider.chat(req);
  }

  async streamComplete(req: ChatRequest): Promise<ReadableStream<string>> {
    this.validate(req);
    if (!this.provider.streamChat) {
      throw new Error("Provider does not support streaming");
    }
    return await this.provider.streamChat(req);
  }

  private validate(req: ChatRequest): void {
    // temperature 范围、maxTokens 合法性等校验
  }
}
```

**学习重点**：外观模式、输入验证、流式 vs 非流式 API 设计。

---

### 7.3 JSON Schema 结构化输出（`genai/schemas/`）

```typescript
// 用 JSON Schema 约束 LLM 输出，确保生成合法的 OpenAPI 3.0 JSON
export const endpointSchema = {
  type: "object",
  properties: {
    method: { type: "string", enum: ["GET","POST","PUT","PATCH","DELETE"] },
    path: { type: "string", pattern: "^/[a-zA-Z0-9_/{}-]+$" },
    summary: { type: "string" },
    responses: { type: "object" },
  },
  required: ["method", "path", "summary", "responses"],
  additionalProperties: false,
};

// 使用 json_schema response_format，LLM 返回的 JSON 100% 符合约束
```

**学习重点**：JSON Schema 设计、`response_format` 机制、`json_schema` vs `json_object` 的选择与回退策略。

---

### 7.4 流式输出 (SSE)（`genai/providers/chat_completions.ts`）

```typescript
// 解析 OpenAI-compatible 的 SSE 流
async *parseSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  for await (const chunk of readLines(body)) {
    if (chunk.startsWith("data: ")) {
      const data = chunk.slice(6);
      if (data === "[DONE]") return;
      const parsed = JSON.parse(data);
      yield parsed.choices?.[0]?.delta?.content ?? "";
    }
  }
}
```

**学习重点**：AsyncGenerator、ReadableStream 处理、SSE 协议解析、流控与取消 (AbortController)。

---

### 7.5 错误分类与重试策略（`genai/errors.ts`）

```typescript
export class LLMError extends Error {
  constructor(
    message: string,
    public category: "auth" | "rate_limit" | "server" | "network" | "unknown",
    public status?: number,
    public source?: string,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

// 根据 HTTP 状态码自动分类
function classifyStatus(status: number): LLMError["category"] {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server";
  return "unknown";
}
```

**学习重点**：自定义 Error 类型、错误分类模式、优雅降级与用户提示。

---

### 7.6 后处理与自动修复（`genai/openapi.ts`）

```typescript
// AI 输出不总是完美的 —— 对已知常见问题进行自动修复
function validateAndFixPath(parsed: Record<string, unknown>): void {
  const path = parsed.path as string;
  // 修复：空路径 → 从 description 推断
  if (!path || path === "/") {
    const inferred = inferPathFromDescription(description);
    parsed.path = inferred;
  }
  // 修复：缺少前导 /
  if (!path.startsWith("/")) {
    parsed.path = "/" + path;
  }
}
```

**学习重点**：防御性编程、AI 输出的不确定性处理、自动修复 vs 报错的权衡。

---

### 7.7 Fallback 机制

```
json_schema → (400 不支持) → json_object → (400 不支持) → text
```

当 LLM 不支持严格的结构化输出时，自动降级到宽松模式，并在响应中标注实际使用的 `format_used`。这是 AI 工程中的"优雅降级"实践。

---

## 8. 模块关系图

```mermaid
graph LR
    main["main.ts"] --> middleware["middleware/logger.ts"]
    middleware --> router["router.ts"]
    router --> gen_h["handlers/generate.ts"]
    router --> health_h["handlers/health.ts"]
    router --> ai_h["handlers/ai.ts"]
    gen_h --> parser["core/parser.ts"]
    gen_h --> generator["core/generator.ts"]
    gen_h --> renderer["core/renderer.ts"]
    adapters["adapters/openapi.ts"] --> generator
    ai_h --> llm["genai/client.ts"]
    llm --> provider["genai/providers/"]
    provider --> schema["genai/schemas/"]
    parser --> types_spec["types/api_spec.ts"]
    generator --> types_spec
    generator --> types_doc["types/doc_node.ts"]
    renderer --> types_doc
```

---

## 9. 学习里程碑

```mermaid
gantt
    title API Doc Generator 学习进度
    dateFormat  YYYY-MM-DD
    section Phase 1 基础搭建
    Deno init + main.ts HTTP server   :p1a, 2026-06-22, 2d
    types/ 定义 interface & union     :p1b, after p1a, 2d
    section Phase 2 核心逻辑
    parser.ts 泛型 + 类型守卫         :p2a, after p1b, 3d
    generator.ts Utility Types        :p2b, after p2a, 3d
    renderer.ts 函数重载              :p2c, after p2b, 2d
    section Phase 3 工程化
    deno test 单元测试                :p3a, after p2c, 2d
    错误处理 + 响应格式规范            :p3b, after p3a, 2d
    section Phase 4 扩展
    支持 OpenAPI 3.x 输入格式         :p4a, after p3b, 3d
    HTML 渲染 + CSS 美化              :p4b, after p4a, 2d
    section Phase 5 AI 集成
    LLMClient + Provider 抽象         :p5a, after p4b, 3d
    JSON Schema 结构化输出            :p5b, after p5a, 2d
    SSE 流式生成                      :p5c, after p5b, 2d
    前端 AI 交互界面                  :p5d, after p5c, 3d
```

---

## 10. API 接口规范

### `POST /generate`

**请求体**（JSON）：

```json
{
  "info": { "title": "My API", "version": "1.0.0" },
  "paths": {
    "/users": {
      "get": {
        "summary": "List users",
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "Success" }
        }
      }
    }
  }
}
```

**Query 参数**：

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `format` | `markdown \| html \| json` | `markdown` | 输出格式 |

**请求头**：

| 头 | 说明 |
|---|---|
| `Accept` | Content Negotiation: `text/markdown`、`text/html`、`application/json`（优先级高于 query param） |

**响应**：生成的文档字符串。

---

### `GET /health`

```json
{ "status": "ok", "timestamp": "2026-06-22T10:00:00Z" }
```

---

### `POST /ai/ping`

测试 LLM 连接：

```json
// Response
{ "ok": true, "reply": "pong", "model": "agnes-2.0-flash", "usage": {...} }
```

---

### `POST /ai/generate-openapi`

从自然语言生成 OpenAPI 规范（非流式）：

```json
// Request
{ "description": "用户管理系统，支持 CRUD 操作", "scope": "document" }

// Response
{ "ok": true, "openapi": {...}, "scope": "document", "usage": {...}, "format_used": "json_schema" }
```

---

### `POST /ai/generate-openapi-stream`

流式生成（SSE），实时返回生成进度：

```
event: delta
data: {"type":"delta","content":"..."}

event: done
data: {"type":"done","result":{"openapi":{...},"format_used":"json_schema"}}
```

---

## 11. 运行方式

```bash
# 初始化（已完成）
deno init api-doc-generator
cd api-doc-generator

# 开发（热重载）
deno task dev

# 生产运行
deno task start
# 或
deno run --allow-net main.ts

# 运行测试
deno task test
# 或
deno test

# 调用示例
curl -X POST http://localhost:8080/generate?format=markdown \
  -H "Content-Type: application/json" \
  -d '{"info":{"title":"Demo","version":"1.0"},"paths":{"/ping":{"get":{"summary":"Ping","responses":{"200":{"description":"pong"}}}}}}'
```

---

## 12. 学习路线对照

| 阶段 | 文件 | 核心概念 |
|---|---|---|
| 1 | `types/api_spec.ts` | `interface`、`type`、字面量联合、`Record` |
| 2 | `core/parser.ts` | 泛型 `<T>`、类型守卫 `is`、`unknown` |
| 3 | `core/generator.ts` | `Utility Types`、条件类型 `infer` |
| 4 | `core/renderer.ts` | 函数重载、`switch` 类型收窄 |
| 5 | `handlers/generate.ts` | `async/await`、`Promise<Response>`、错误分类处理 |
| 6 | `router.ts` | `URLPattern` Web Standard 路由 |
| 7 | `middleware/logger.ts` | 请求日志、耗时记录、中间件模式 |
| 8 | `adapters/openapi.ts` | 适配器模式、OpenAPI → ApiSpec 转换 |
| 9 | `tests/*_test.ts` | `Deno.test`、`assertEquals`、集成测试 |
| 10 | `genai/types.ts` | 接口抽象、依赖倒置、Provider 模式 |
| 11 | `genai/client.ts` | 外观模式、输入验证、流式/非流式双模式 |
| 12 | `genai/providers/` | OpenAI API 协议、SSE 解析、错误分类 |
| 13 | `genai/schemas/` | JSON Schema 设计、结构化输出约束 |
| 14 | `genai/openapi.ts` | AI 输出后处理、自动修复、Fallback 策略 |

---

## 13. 设计改进

以下改进在实现过程中识别并应用，使项目在保留学习目标的同时更接近生产标准：

| # | 改进 | 说明 |
|---|------|------|
| 1 | 错误分类处理 | ParseError(400)、GenerateError(自定义)、未知错误(500+log) |
| 2 | 多层级类型校验 | isApiInfo → isPathItem → isOperation 递归校验 |
| 3 | Renderer 统一返回 string | 去掉 JSON 返回 object 的不一致 |
| 4 | Content Negotiation | Accept header 回退 + query param |
| 5 | 请求日志中间件 | 记录耗时、method、path、status |
| 6 | URLPattern 路由 | Web Standard，method + path 精确匹配 |
| 7 | OpenAPI 适配器独立 | adapters/ 目录，适配器模式，不侵入核心 |
| 8 | 递归 Schema 转换 | 支持嵌套 object 和 array 类型 |
| 9 | HTML 内联 CSS 美化 | Phase 4 目标直接在核心渲染器中实现 |
| 10 | Utility Types 实际使用 | Pick/Readonly 用于实际业务逻辑 |
| 11 | 新增 middleware/ 层 | 日志、错误处理与业务逻辑解耦 |
| 12 | 函数重载统一返回类型 | render() 所有重载返回 string |

---

> **一句话总结**：这个项目的价值不在文档生成本身，而在于：后端每一层模块都是 TypeScript 特性的刻意练习题；AI 模块则是 LLM 工程化的完整实战 —— Provider 抽象、结构化输出、流式响应、错误恢复、Fallback 策略。读完代码，TS 类型系统和 AI 应用开发的核心就基本通了。
