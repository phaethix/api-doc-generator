# 阶段 2：结构化输出 — AI 严格生成 OpenAPI JSON

> 日期：2026-06-24
> 阶段：阶段 2 / 共 8 阶段
> 前置：阶段 1 已完成（LLMClient + 错误分类 + 超时）

## 1. 目标

让 AI 不再返回自由文本，而是**严格输出 OpenAPI 3.0 JSON**，可直接被项目现有的 Parser → Generator → Renderer 流水线消费。

## 2. 架构

```
POST /ai/generate-openapi
  { description: string, scope?: "endpoint" | "document" }
        │
        ▼
  OpenAPIGenerator (genai/openapi.ts)
    ├─ 1. 选择 JSON Schema（endpoint | document）
    ├─ 2. 构造 system + user prompt
    ├─ 3. 调用 LLMClient.complete({ responseFormat: { json_schema } })
    ├─ 4. JSON.parse 并校验（双保险，即使 provider 不强制）
    └─ 5. 返回 { openapi: object, usage }
        │
        ▼
  ChatCompletionsProvider
    └─ body 中包含 response_format 字段
        ├─ 首选: type:"json_schema" + 严格 schema
        └─ 降级: type:"json_object" + 本地 Zod/JSON 校验
```

## 3. 关键设计决策

### 3.1 response_format 抽象

`ChatRequest` 新增可选字段：

```typescript
type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: { name: string; schema: object; strict?: boolean } };
```

Provider 直接透传到底层 API。失败时（model 不支持 json_schema）由上层 Generator 捕获并降级。

### 3.2 降级策略

```
1. 先尝试 json_schema（最严格）
2. 如果得到 400 错误且错误提及 response_format/schema，降级到 json_object
3. 降级后，本地用 JSON Schema 校验结果
4. 仍然失败 → 抛 LLMError with category "unknown"
```

### 3.3 OpenAPI JSON Schema 定义

两个粒度：

| 粒度 | 用途 | 字段 |
|------|------|------|
| **endpoint** | 单接口生成 | method, path, summary, description, parameters[], responses{} |
| **document** | 完整文档 | openapi, info, servers[], paths{}, components{} |

## 4. 两种粒度示例

### 4.1 endpoint（精简，适合快速生成）

```json
{
  "method": "GET",
  "path": "/users/{id}",
  "summary": "获取用户详情",
  "description": "根据 ID 查询用户完整信息",
  "parameters": [
    { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
  ],
  "responses": {
    "200": { "description": "成功", "content": { "application/json": { "schema": { "type": "object" } } } }
  }
}
```

### 4.2 document（完整 OpenAPI 3.0）

```json
{
  "openapi": "3.0.3",
  "info": { "title": "...", "version": "1.0.0" },
  "paths": { "/users": { "get": { ... } } }
}
```

## 5. 端点定义

```
POST /ai/generate-openapi
Content-Type: application/json

{
  "description": "用户管理系统，包含查询用户列表和创建用户两个接口",
  "scope": "endpoint"   // 或 "document"，默认 "endpoint"
}

Response 200:
{
  "ok": true,
  "openapi": { ... },          // 生成的 OpenAPI 对象
  "scope": "endpoint",
  "usage": { "promptTokens": 100, "completionTokens": 200 },
  "model": "agnes-2.0-flash",
  "format_used": "json_schema"  // 或 "json_object"，实际使用的格式
}

Response 4xx/5xx: 同 /ai/ping 的错误分类
```

## 6. 测试计划

| 测试 | 覆盖 |
|------|------|
| Provider 序列化 response_format | 验证 body 包含正确字段 |
| Provider 不支持 json_schema 时降级 | 模拟 400 错误 |
| Endpoint JSON Schema 校验 | 有效输入通过，无效拒绝 |
| OpenAPI Generator 端到端 | mock fetch，验证输出结构 |
| 后端 handler | 完整请求/响应 流程 |

## 7. 文件清单

### 新增
- `genai/schemas/endpoint.ts` — 单 endpoint JSON Schema
- `genai/schemas/document.ts` — 完整 OpenAPI 3.0 JSON Schema
- `genai/schemas/index.ts` — 统一导出
- `genai/openapi.ts` — `OpenAPIGenerator` 类（高层 API）
- `genai/tests/openapi_test.ts` — 阶段 2 测试

### 修改
- `genai/types.ts` — 加 `ResponseFormat` 和 `LLMError` 可携带 `formatUsed`
- `genai/providers/chat_completions.ts` — 序列化 `response_format`
- `genai/client.ts` — 在 validate 中允许 responseFormat
- `genai/index.ts` — 导出新模式
- `backend/handlers/ai.ts` — 新增 `handleAIGenerateOpenAPI`
- `backend/router.ts` — 加路由
- 设计文档更新

## 8. 验收标准

- [ ] `deno test` 全绿
- [ ] 端到端调用 `POST /ai/generate-openapi` 返回合法 JSON
- [ ] 返回的 JSON 用 `JSON.parse` 后结构正确
- [ ] 无效输入得到清晰的 4xx/5xx 响应
