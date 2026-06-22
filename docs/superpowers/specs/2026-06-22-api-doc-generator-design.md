# API Doc Generator — Design Spec

> 2026-06-22 | 实用优先，兼顾学习

## Overview

基于 Deno + TypeScript 的 HTTP 服务，接收 API 接口描述（自定义格式或 OpenAPI 3.x），输出标准化文档（Markdown / HTML / JSON）。

项目同时作为 TypeScript 核心特性的学习载体，覆盖：类型系统、泛型、Utility Types、函数重载、异步错误处理、装饰器模式。

---

## Directory Structure

```
api-doc-generator/
├── deno.json                  # 项目配置、任务、imports
├── main.ts                    # 入口：中间件链 + Deno.serve
├── router.ts                  # Method + URLPattern 路由分发
├── types/
│   ├── api_spec.ts            # ApiSpec、Operation、Parameter、Schema 等核心 interface
│   └── doc_node.ts            # 中间表示：DocNode、Endpoint、ParamDetail 等
├── handlers/
│   ├── generate.ts            # POST /generate 处理器
│   └── health.ts              # GET /health 处理器
├── core/
│   ├── parser.ts              # 泛型解析 + 多层级结构化类型校验
│   ├── generator.ts           # ApiSpec → DocNode[] (Utility Types 实战)
│   └── renderer.ts            # DocNode[] → 格式化字符串 (函数重载)
├── middleware/
│   └── logger.ts              # 请求日志 + 响应耗时
├── adapters/
│   └── openapi.ts             # OpenAPI 3.x → ApiSpec 转换 (适配器模式)
└── tests/
    ├── parser_test.ts
    ├── generator_test.ts
    ├── renderer_test.ts
    ├── integration_test.ts
    └── openapi_test.ts
```

---

## Architecture

```
Client → Deno.serve (main.ts) → Router (router.ts)
                                      ↓
                        POST /generate  →  handleGenerate
                        GET /health     →  handleHealth
                        404             →  "Not Found"

handleGenerate:
  1. resolveFormat  (query param → Accept header → default markdown)
  2. req.json()     (body → unknown)
  3. parseBody      (unknown → ApiSpec, via 泛型 + 类型守卫)
  4. generate       (ApiSpec → DocNode, via Utility Types)
  5. render         (DocNode → string, via 函数重载)
  6. Response       (string + Content-Type header)

Error flow:
  ParseError  → 400 + {error, field?}
  GenerateError → 400+ (configurable status)
  unknown     → 500 + log
```

---

## Types

### `types/api_spec.ts`

| Type | Kind | Purpose |
|------|------|---------|
| `HttpMethod` | union type (`"GET" \| "POST" \| ...`) | 对比 enum 的轻量替代 |
| `OutputFormat` | enum (`Markdown`, `HTML`, `JSON`) | 需要同时作值和类型的场景 |
| `Schema` | interface | 递归类型定义，支持嵌套 object/array |
| `Parameter` | interface | query/path/header/cookie 参数 |
| `ApiResponse` | interface | 响应定义 |
| `RequestBody` | interface | 请求体定义 |
| `Operation` | interface | 单个 HTTP 操作 |
| `PathItem` | interface | 路径上的方法集合 |
| `ApiInfo` | interface | API 元信息 |
| `ApiSpec` | interface | 顶层输入结构，预留 servers/tags |

### `types/doc_node.ts`

| Type | Purpose |
|------|---------|
| `DocNode` | 顶层中间表示，内含 api 信息 + endpoints + tags 分组 |
| `Endpoint` | 展平后的单个接口（method + path + 参数/请求体/响应） |
| `ParamDetail` | 参数详情（去掉了 Schema 嵌套，保留可读 type 标签） |
| `BodyDetail` | 请求体详情 |
| `ResponseDetail` | 响应详情 |
| `TagGroup` | 按 tag 分组的 endpoint 集合 |

---

## Core Modules

### `core/parser.ts` — 校验 + 解析

**TS 学习点：泛型 `<T>`、类型守卫 `is`、`unknown` vs `any`**

- `parseBody<T>(raw, guard)` → 泛型解析，守卫失败抛 `ParseError`
- `isApiSpec(x): x is ApiSpec` → 顶层守卫
- `isApiInfo` / `isPathItem` / `isOperation` → 多层级结构化校验
- `ParseError(message, field?)` → 自定义错误，精确到字段路径

### `core/generator.ts` — 转换

**TS 学习点：Utility Types (`Pick`, `Readonly`, `Partial`, 条件类型 `infer`)**

- `generate(spec)` → ApiSpec → DocNode
- `flattenPaths` → 展开嵌套的 `Record<string, PathItem>` 为 `Endpoint[]`
- `buildEndpoint` → 使用 `Pick<Operation, "summary"|"description">` 提取字段
- 参数 `Readonly<ApiSpec>` 确保不可变
- `schemaLabel` → Schema 转可读标签 (`"string"`, `"integer[]"`)

### `core/renderer.ts` — 输出

**TS 学习点：函数重载 + switch 类型收窄**

- 3 个重载签名 + 1 个实现签名，所有重载统一返回 `string`
- `renderMarkdown` → 完整的 Markdown 模板（标题、表格、参数列表）
- `renderHTML` → 完整的 HTML 页面（内联 CSS、tag 标签、method 着色）
- `renderJSON` → `JSON.stringify(doc, null, 2)`
- `escapeHtml` → XSS 防护

---

## Handlers

### `handlers/health.ts`

- `GET /health` → `{ status: "ok", timestamp: "..." }`
- 纯函数，无依赖

### `handlers/generate.ts`

- `POST /generate?format=html` → 生成文档
- `resolveFormat`: query param → Accept header → default markdown
- 错误分类：ParseError(400) / GenerateError(custom) / unknown(500 + log)

---

## Router & Middleware

### `router.ts`

- 使用 `URLPattern` (Web Standard) 做路由匹配
- 同时匹配 HTTP method + path
- 返回 handler 或 null

### `middleware/logger.ts`

- 记录：时间戳、method、path、status、耗时(ms)

### `main.ts`

- 组装路由 + 日志 + 404 兜底
- `Deno.serve({ port: 8080 }, handler)`

---

## OpenAPI Adapter

### `adapters/openapi.ts`

- 适配器模式：不修改核心流水线
- `fromOpenAPI(OpenAPIDoc) → ApiSpec → DocNode`
- 递归转换 schema（支持嵌套 object/array）
- 完整的 `info` / `servers` / `tags` / `paths` / `components.schemas` 映射

---

## API Spec

### `POST /generate`

**Request Body** (JSON):
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

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | `markdown \| html \| json` | `markdown` | Output format; also supports Accept header |

### `GET /health`

```json
{ "status": "ok", "timestamp": "2026-06-22T10:00:00Z" }
```

---

## Testing Strategy

| File | Scope |
|------|-------|
| `tests/parser_test.ts` | `isApiSpec` 有效/无效输入、`parseBody` 泛型行为、`ParseError` |
| `tests/generator_test.ts` | 多 path 展平、多 method 拆分、Utility Type 覆盖、参数/响应转换 |
| `tests/renderer_test.ts` | Markdown/HTML/JSON 输出格式、escapeHtml、空文档边界 |
| `tests/integration_test.ts` | 端到端：POST /generate → 返回正确文档；GET /health；404 |
| `tests/openapi_test.ts` | OpenAPI 3.x 最小示例 → DocNode；嵌套 schema 递归 |

---

## Dependencies

```json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@1"
  }
}
```

零额外运行时依赖，仅 `@std/assert` 用于测试。

---

## Key Improvements over Whitepaper

1. **错误处理分类** — ParseError(400) / GenerateError(custom) / unknown(500+log)
2. **多层级类型校验** — `isApiInfo` → `isPathItem` → `isOperation` 递归校验
3. **Renderer 统一返回 string** — 去掉 JSON 返回 `object` 的不一致
4. **Content Negotiation** — Accept header 回退 + query param
5. **请求日志中间件** — 可观测性
6. **URLPattern 路由** — Web Standard，method + path 精确匹配
7. **OpenAPI 适配器独立** — 适配器模式，不侵入核心逻辑
8. **完整递归 Schema 转换** — 支持嵌套类型
9. **HTML 内联 CSS 美化** — Phase 4 直接包含
10. **Utility Types 实际使用** — `Pick`/`Readonly` 用于实际业务，非仅定义

---

## TypeScript Learning Coverage

| Module | TS Features |
|--------|-------------|
| `types/api_spec.ts` | `interface` vs `type` vs `enum`、字面量联合、`Record<K,V>`、可选属性 |
| `core/parser.ts` | 泛型 `<T>`、类型守卫 `is`、`unknown` vs `any`、自定义 Error |
| `core/generator.ts` | `Pick`/`Readonly`/`Partial`、条件类型 `infer`、`as const`、`Record` |
| `core/renderer.ts` | 函数重载、switch exhaustiveness check、enum 映射 |
| `handlers/generate.ts` | `async/await`、`Promise<Response>`、错误分类处理 |
| `adapters/openapi.ts` | 适配器模式、`Record<string, unknown>`、递归类型转换 |
| `tests/*_test.ts` | `Deno.test`、`assertEquals`/`assertThrows` |

---

## Run Commands

```bash
deno task dev          # 热重载开发
deno run --allow-net main.ts   # 生产运行
deno test              # 所有测试
deno test --coverage   # 带覆盖率

# Example
curl -X POST http://localhost:8080/generate?format=html \
  -H "Content-Type: application/json" \
  -d '{"info":{"title":"Demo","version":"1.0"},"paths":{"/ping":{"get":{"summary":"Ping","responses":{"200":{"description":"pong"}}}}}}'
```
