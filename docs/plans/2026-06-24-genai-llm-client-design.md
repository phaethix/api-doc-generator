# GenAI LLMClient 设计文档

> 日期：2026-06-24
> 阶段：阶段 1 / 共 8 阶段（AI 学习路径）
> 目标：建立项目级 LLM 客户端，作为后续 AI 功能的基础

## 1. 背景与目标

本项目（API Doc Generator）的目标是**以项目为载体学习 AI 开发**。阶段 1 的焦点是建立可复用、可测试的 LLM 客户端，覆盖以下能力：

- 调用 OpenAI 兼容协议（覆盖 OpenAI/Anthropic/Google/Ollama）
- 统一错误类型
- 类型安全（TypeScript strict mode）
- 配置从 env 读取
- 为后续流式输出、结构化输出、RAG 预留接口

## 2. 目录结构

```
genai/                          # 顶层独立 AI 模块
├── deno.json                   # 独立依赖管理
├── index.ts                    # 统一出口（re-export 公共 API）
├── client.ts                   # LLMClient 主类
├── types.ts                    # 统一类型定义
├── providers/
│   ├── types.ts                # Provider 接口
│   ├── openai.ts               # OpenAI 兼容协议实现
│   └── index.ts                # Provider 工厂（预留）
├── prompts/
│   ├── enhance.ts              # 字段增强 Prompt（阶段 2 用到）
│   └── chat.ts                 # 对话 Prompt（阶段 6 用到）
└── tests/
    └── client_test.ts          # Mock Provider 测试
```

## 3. 类型定义（genai/types.ts）

```typescript
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;        // 阶段 3 启用
}

export interface ChatResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}

export interface Provider {
  chat(req: ChatRequest): Promise<ChatResponse>;
}
```

## 4. LLMClient 主类（genai/client.ts）

```typescript
import type { ChatRequest, ChatResponse } from "./types.ts";
import type { Provider } from "./providers/types.ts";

export class LLMClient {
  constructor(private provider: Provider) {}

  async complete(req: ChatRequest): Promise<ChatResponse> {
    return await this.provider.chat(req);
  }
}
```

## 5. OpenAI Provider（genai/providers/openai.ts）

```typescript
import type { ChatRequest, ChatResponse, Provider } from "./types.ts";

export class LLMError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "LLMError";
  }
}

export class OpenAIProvider implements Provider {
  constructor(
    private apiKey: string,
    private baseUrl = "https://api.openai.com/v1",
    private model = "gpt-4o-mini",
  ) {}

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const resp = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens,
        stream: false,
      }),
    });

    if (!resp.ok) {
      throw new LLMError(`OpenAI API error: ${resp.status}`, resp.status);
    }

    const data = await resp.json();
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      },
      model: data.model,
    };
  }
}
```

## 6. 工厂与配置（genai/index.ts）

```typescript
import { LLMClient } from "./client.ts";
import { OpenAIProvider, LLMError } from "./providers/openai.ts";
import type { Provider } from "./providers/types.ts";

export function createLLMClient(): LLMClient {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY env required");

  const provider: Provider = new OpenAIProvider(
    apiKey,
    Deno.env.get("OPENAI_BASE_URL"),
    Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini",
  );

  return new LLMClient(provider);
}

export { LLMClient, OpenAIProvider, LLMError };
export type * from "./types.ts";
```

## 7. 测试设计（genai/tests/client_test.ts）

使用 **Mock Provider** 验证客户端转发逻辑，不烧真实 token：

```typescript
import { LLMClient } from "../client.ts";
import type { Provider, ChatRequest, ChatResponse } from "../types.ts";

class MockProvider implements Provider {
  constructor(private response: string) {}
  async chat(_req: ChatRequest): Promise<ChatResponse> {
    return { content: this.response, usage: { promptTokens: 10, completionTokens: 5 }, model: "mock" };
  }
}

Deno.test("LLMClient.complete returns content", async () => {
  const client = new LLMClient(new MockProvider("hello"));
  const res = await client.complete({ messages: [{ role: "user", content: "hi" }] });
  if (res.content !== "hello") throw new Error("expected 'hello'");
});
```

## 8. Backend 集成（backend/handlers/ai.ts）

```typescript
import { createLLMClient } from "../../genai/index.ts";

export async function handleAIPing(req: Request): Promise<Response> {
  try {
    const client = createLLMClient();
    const res = await client.complete({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Reply with just the word: pong" },
      ],
      temperature: 0,
    });
    return Response.json({ reply: res.content, usage: res.usage });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
```

路由注册在 `backend/router.ts` 添加 `POST /ai/ping`。

## 9. 实施步骤

1. 切新分支：`feat/genai-llm-client`
2. 创建 `genai/` 目录及文件
3. 实现 LLMClient + OpenAIProvider
4. 编写 mock 测试
5. 集成到 backend：新增 `/ai/ping` 端点
6. 运行 `cd genai && deno test -A` 验证
7. 用真实 API Key 端到端验证 `curl localhost:8080/ai/ping`
8. 按 conventional commits 规范 commit

## 10. 后续阶段预览

| # | 阶段 | 对应功能 |
|---|------|----------|
| 1 | ✅ LLM 基础调用 | `/ai/ping` 端点 |
| 2 | 结构化输出 | AI 严格输出 OpenAPI JSON |
| 3 | Streaming | 润色过程打字机效果 |
| 4 | Prompt 工程 | 不同 Prompt 质量对比 |
| 5 | Token 优化 | 缓存、成本分析 |
| 6 | RAG 基础 | 文档智能问答 |
| 7 | RAG 进阶 | 混合检索 + Rerank |
| 8 | Function Calling | AI 跳转接口、生成测试 |
