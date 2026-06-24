# GenAI LLMClient 设计文档

> 日期：2026-06-24
> 阶段：阶段 1 / 共 8 阶段（AI 学习路径）
> 目标：建立项目级 LLM 客户端，作为后续 AI 功能的基础

## 1. 背景与目标

本项目（API Doc Generator）的目标是**以项目为载体学习 AI 开发**。阶段 1 建立可复用、可测试的 LLM 客户端，覆盖：

- OpenAI 兼容协议（Agnes AI / OpenAI / DeepSeek / Ollama…）
- **错误分类**（auth / rate_limit / server / network / unknown）
- **超时控制**（AbortController）
- **请求校验**（空消息、参数范围）
- **配置对象模式**（env + 显式配置）
- 类型安全
- 为后续流式输出、结构化输出、RAG 预留接口

## 2. 目录结构

```
genai/                          # 顶层独立 AI 模块
├── deno.json                   # 独立依赖管理
├── index.ts                    # 公共 API 出口（工厂 + re-export）
├── client.ts                   # LLMClient 主类（含请求校验）
├── types.ts                    # 统一类型定义
├── errors.ts                   # LLMError + LLMConfigError
├── providers/
│   └── chat_completions.ts     # OpenAI 兼容协议实现
└── tests/
    └── client_test.ts          # 12 个测试用例（mock + fetch shim）
```

## 3. 核心类型（genai/types.ts）

```typescript
export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage { role: ChatRole; content: string; }

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;       // 单次请求超时
  stream?: boolean;         // 阶段 3 启用
}

export interface Usage { promptTokens: number; completionTokens: number; }

export interface ChatResponse { content: string; usage: Usage; model: string; }

export interface Provider { chat(req: ChatRequest): Promise<ChatResponse>; }
```

## 4. 错误分类（genai/errors.ts）

```typescript
export type LLMErrorCategory =
  | "auth" | "rate_limit" | "server" | "network" | "unknown";

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly category: LLMErrorCategory,
    public readonly status?: number,
    public readonly provider?: string,
  ) { super(message); this.name = "LLMError"; }
}

export class LLMConfigError extends Error {
  constructor(message: string) { super(message); this.name = "LLMConfigError"; }
}
```

错误类别到 HTTP 状态码的映射位于 `backend/handlers/ai.ts`：

```typescript
const STATUS_BY_CATEGORY: Record<LLMErrorCategory, number> = {
  auth: 401, rate_limit: 429, server: 502, network: 503, unknown: 500,
};
```

## 5. ChatCompletionsProvider（genai/providers/chat_completions.ts）

关键设计：

- **超时**：通过 `AbortController` + `setTimeout` 实现，错误归类为 `"network"`
- **错误分类**：根据 HTTP 状态码映射到 `LLMErrorCategory`
- **网络错误**：`fetch` 抛出的 `TypeError` 归类为 `"network"`
- **防御性解析**：`choices?.[0]?.message?.content ?? ""`，兼容不同 provider

## 6. LLMClient（genai/client.ts）

请求校验：
- 消息不能为空
- `temperature` 必须在 [0, 2] 范围内
- `maxTokens` 必须为正数

## 7. 工厂模式（genai/index.ts）

```typescript
export interface LLMClientConfig {
  apiKey: string;
  baseUrl?: string;       // 默认: https://apihub.agnes-ai.com/v1
  model?: string;         // 默认: agnes-2.0-flash
  timeoutMs?: number;     // 默认: 30000
}

// 用法：
createLLMClient()                           // 全从 env
createLLMClient({ apiKey: "..." })          // 显式 key，其余从 env
createLLMClient({ timeoutMs: 60_000 })      // 只覆盖超时
```

## 8. 测试覆盖（12 个用例）

| 类别 | 测试用例 |
|------|----------|
| 转发 | 消息转发、参数透传（temperature/maxTokens） |
| 校验 | 空消息、temperature 越界、maxTokens ≤ 0 |
| 工厂 | 缺 key → LLMConfigError、显式配置、env fallback |
| Provider | 成功响应解析、状态码分类（401/403/429/5xx/4xx）、超时、网络错误 |

fetch shim 实现：通过替换 `globalThis.fetch` 模拟成功/失败/超时场景，无需真实网络。

## 9. Backend 集成

### 9.1 环境变量加载（backend/shared/env.ts）

```typescript
await loadProjectEnv({ from: import.meta.dirname });
```

从调用方目录向上一级定位项目根 `.env`，注入到 `Deno.env`。

### 9.2 AI Handler（backend/handlers/ai.ts）

```typescript
export async function handleAIPing(_req: Request): Promise<Response> {
  try {
    const client = createLLMClient();
    const res = await client.complete({ ... });
    return Response.json({ ok: true, reply: res.content, ... });
  } catch (err) {
    if (err instanceof LLMError) {
      const status = STATUS_BY_CATEGORY[err.category] ?? 500;
      return Response.json({ ok: false, error: err.message, category: err.category }, { status });
    }
    // LLMConfigError 和其他异常 → 500
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
```

## 10. 后续阶段预览

| # | 阶段 | 对应功能 |
|---|------|----------|
| 1 | ✅ LLM 基础调用 | `/ai/ping` 端点，错误分类，超时控制 |
| 2 | 结构化输出 | AI 严格输出 OpenAPI JSON (JSON Mode / Tool Calling) |
| 3 | Streaming | 润色过程打字机效果 |
| 4 | Prompt 工程 | 不同 Prompt 质量对比 |
| 5 | Token 优化 | 缓存、成本分析 |
| 6 | RAG 基础 | 文档智能问答 |
| 7 | RAG 进阶 | 混合检索 + Rerank |
| 8 | Function Calling | AI 跳转接口、生成测试 |
