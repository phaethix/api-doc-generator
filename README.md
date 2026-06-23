# API Doc Generator

> 🌿 **分支**: `feature/model-c-fullstack` — Deno + Fresh + Preact Islands 实现方案

一个基于 **Deno + Fresh + Preact** 的全栈 API 文档生成工具，采用 [Islands Architecture](https://fresh.deno.dev/docs/concepts/islands) 实现极致性能，支持从 API 规范一键生成精美的 Markdown / HTML / JSON 文档。

## ✨ 特性

- 🏝️ **Fresh 框架**：基于 Islands 架构，服务端渲染 + 按需水合，首屏加载极快
- ⚛️ **Preact**：3KB 级的轻量 React 替代方案，兼容 React 生态
- 🎨 **Tailwind CSS**：实用优先的 CSS 框架，开箱即用的响应式设计
- 📝 **多格式输出**：Markdown、HTML、JSON 三种格式
- 🔌 **OpenAPI 3.x 支持**：内置 OpenAPI 适配器
- ⚡ **零 JS by default**：非交互组件零 JavaScript 开销
- 🔄 **热重载**：dev server 自动监听文件变化
- 🛡️ **类型安全**：全 TypeScript + JSX（react-jsx，jsxImportSource: preact）

## 🏗️ 核心架构 — Islands Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Browser (http://localhost:8080)                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  SSR HTML (Pre-rendered by Fresh on server)         │ │
│  │                                                     │ │
│  │  <Header /> ← 静态，零 JS                           │ │
│  │  <Hero    /> ← 静态，零 JS                           │ │
│  │  <GeneratorForm /> ← 🏝️ Island (水合 JSON Editor) │ │
│  │  <ResultPanel    /> ← 🏝️ Island (水合结果展示)     │ │
│  │  <Footer  /> ← 静态，零 JS                           │ │
│  └────────────────────────────────────────────────────┘ │
└────────────────────────────┬─────────────────────────────┘
                             │ fetch /api/generate
                             ▼
┌──────────────────────────────────────────────────────────┐
│  Deno + Fresh Server (port 8080)                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  routes/_app.tsx        ← 全局布局                   │ │
│  │  routes/index.tsx       ← 首页 (含 Islands)         │ │
│  │  routes/docs.tsx        ← 文档页                    │ │
│  │  routes/_404.tsx        ← 404 页面                  │ │
│  │                                                     │ │
│  │  routes/api/             ← API 路由 (文件路由)      │ │
│  │  ├── index.ts            ← GET /api (列表)          │ │
│  │  ├── health.ts           ← GET /api/health          │ │
│  │  └── generate.ts         ← POST /api/generate       │ │
│  └──────────────┬─────────────────────────────────────┘ │
│                 ▼                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  handlers/                                          │ │
│  │  ├── generate.ts  (POST /api/generate 的核心逻辑)  │ │
│  │  └── health.ts    (GET  /api/health  的核心逻辑)   │ │
│  └──────────────┬─────────────────────────────────────┘ │
│                 ▼                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Core Pipeline                                      │ │
│  │  ┌─────────┐  ┌────────────┐  ┌────────────────┐  │ │
│  │  │ Parser  │→ │ Generator  │→ │ Renderer       │  │ │
│  │  │ 类型守卫 │  │ ApiSpec→   │  │ DocNode→       │  │ │
│  │  │ 验证     │  │ DocNode    │  │ md/html/json   │  │ │
│  │  └─────────┘  └────────────┘  └────────────────┘  │ │
│  └──────────────┬─────────────────────────────────────┘ │
│                 ▼                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │  adapters/openapi.ts — OpenAPI 3.x → ApiSpec       │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 为什么选择 Islands Architecture？

| 维度 | 传统 SPA (model-a/b) | Islands (model-c) |
|------|---------------------|-------------------|
| 首屏加载 | 需下载完整 JS bundle | 仅下载交互必需的 JS |
| SEO | 需要额外 SSR 配置 | 原生 SSR，SEO 友好 |
| 开发体验 | 前端独立项目 | 前后端一体，单仓库 |
| 静态组件 | 全部水合 | 静态渲染，零 JS 开销 |
| 部署 | 需构建 + 单独部署前端 | 单一 Deno 进程 |

## 🏗️ 技术栈

### 后端 + 前端框架

- **[Fresh 1.7.3](https://fresh.deno.dev/)** — Deno 原生全栈框架
- **[Preact 10.22.0](https://preactjs.com/)** — 轻量 React 替代方案
- **[Deno 2.x](https://deno.land/)** — 现代 JS/TS 运行时
- **TypeScript (strict mode)** — 类型系统

### 样式与工具

- **[Tailwind CSS 3.4.4](https://tailwindcss.com/)** — Fresh 官方插件
- **[@preact/signals 1.2.2](https://preactjs.com/guide/v10/signals/)** — 响应式状态管理
- **[tailwind-merge 2.2.0](https://github.com/dcastil/tailwind-merge)** — 类名合并

## 📁 项目结构

```
api-doc-generator/
├── main.ts                 # 应用入口（启动 Fresh server）
├── dev.ts                  # 开发模式入口（带 --watch）
├── fresh.config.ts         # Fresh 配置（端口 + Tailwind 插件）
├── fresh.gen.ts            # 自动生成的路由/Island manifest
├── deno.json               # Deno 配置 + tasks + imports
├── deno.lock               # 依赖锁定
├── tailwind.config.ts      # Tailwind 配置（品牌色 brand-* 等）
│
├── routes/                 # 📂 文件路由（Fresh 核心特性）
│   ├── _app.tsx            # 全局布局（包裹所有页面）
│   ├── _404.tsx            # 404 页面
│   ├── index.tsx           # 首页 /
│   ├── docs.tsx            # 文档页 /docs
│   └── api/                # API 路由（返回 JSON，非 JSX）
│       ├── index.ts        # GET /api
│       ├── health.ts       # GET /api/health
│       └── generate.ts     # POST /api/generate
│
├── islands/                # 🏝️ 交互式组件（仅这些会被水合）
│   ├── GeneratorForm.tsx   # 输入面板（含 JSON Editor）
│   └── ResultPanel.tsx     # 结果展示（含复制、预览切换）
│
├── components/             # 静态组件（服务端渲染，零 JS）
│   ├── Header.tsx          # 顶部导航
│   └── Footer.tsx          # 页脚
│
├── handlers/               # HTTP 请求处理器（业务逻辑）
│   ├── generate.ts         # 文档生成逻辑
│   └── health.ts           # 健康检查逻辑
│
├── core/                   # 核心业务管道
│   ├── generator.ts        # ApiSpec → DocNode
│   ├── parser.ts           # 类型守卫与验证
│   └── renderer.ts         # DocNode → md/html/json
│
├── adapters/               # 外部格式适配器
│   └── openapi.ts          # OpenAPI 3.x → ApiSpec
│
├── middleware/             # 中间件
│   └── logger.ts           # 请求日志
│
├── types/                  # 类型定义
│   ├── api_spec.ts         # ApiSpec 类型
│   └── doc_node.ts         # DocNode 类型
│
├── static/                 # 静态资源（favicon 等）
├── tests/                  # 测试文件
│   ├── generator_test.ts
│   ├── integration_test.ts
│   ├── openapi_test.ts
│   ├── parser_test.ts
│   └── renderer_test.ts
│
└── legacy_handler.ts       # 兼容旧版 handler（迁移辅助）
```

## 🚀 快速开始

### 前置要求

- [Deno 2.x](https://deno.land/) — `deno --version` 确认版本

### 启动开发模式

```bash
# 克隆项目
git clone <your-repo-url>
cd api-doc-generator

# 启动开发服务器（自动监听文件变化）
deno task dev
```

服务将在 `http://localhost:8080` 启动，支持热重载。

### 生产构建与启动

```bash
# 构建（生成优化后的静态资源）
deno task build

# 启动生产服务器
deno task preview
```

### 运行测试

```bash
deno task test
```

### 可用任务

| 命令 | 说明 |
|------|------|
| `deno task dev` | 开发模式（带文件监听和热重载） |
| `deno task start` | 启动开发服务器 |
| `deno task build` | 生产构建 |
| `deno task preview` | 生产预览 |
| `deno task test` | 运行测试 |

## 📖 使用指南

### Web 界面

1. 打开 `http://localhost:8080`
2. 在 GeneratorForm 中输入或粘贴 API 规范（JSON 格式）
3. 选择输出格式（Markdown / HTML / JSON）
4. 点击「生成文档」按钮
5. ResultPanel 中查看结果，支持：
   - 预览/原始切换
   - 一键复制到剪贴板
   - Markdown 实时渲染、HTML iframe 预览、JSON 格式化

### REST API

#### 健康检查

```bash
GET /api/health
```

响应：
```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

#### 生成文档

```bash
POST /api/generate?format=markdown|html|json
Content-Type: application/json

{
  "info": {
    "title": "Pet Store",
    "version": "1.0.0"
  },
  "paths": {
    "/pets": {
      "get": {
        "summary": "List all pets",
        "responses": { "200": { "description": "OK" } }
      }
    }
  }
}
```

**curl 示例**：
```bash
curl -X POST 'http://localhost:8080/api/generate?format=markdown' \
  -H 'Content-Type: application/json' \
  -d '{
    "info": {"title":"Pet Store","version":"1.0.0"},
    "paths":{"/pets":{"get":{"summary":"List pets","responses":{"200":{"description":"OK"}}}}}
  }'
```

#### 列出 API

```bash
GET /api
```

返回 API 元信息。

## 🧩 Fresh 框架关键概念

### 文件路由

Fresh 使用文件系统路由，无需手动配置：

| 文件路径 | URL 路径 |
|---------|---------|
| `routes/index.tsx` | `/` |
| `routes/docs.tsx` | `/docs` |
| `routes/api/health.ts` | `/api/health` |
| `routes/_404.tsx` | 404 页面 |
| `routes/_app.tsx` | 全局布局（包裹所有页面） |

### Islands — 交互式组件

只有 `islands/` 目录下的组件会被发送到客户端并水合：

```tsx
// islands/GeneratorForm.tsx — 会被水合
import { useState } from "preact/hooks";

export default function GeneratorForm() {
  const [spec, setSpec] = useState("");
  // ... 交互逻辑
}
```

```tsx
// components/Header.tsx — 纯静态，零 JS
export default function Header() {
  return <header>...</header>;
}
```

### Preact Signals（响应式状态）

```tsx
import { signal } from "@preact/signals";

const count = signal(0);
count.value++; // 自动触发 UI 更新
```

## 📝 API 规范

### 自定义 API 规范

```json
{
  "info": {
    "title": "API 标题",
    "version": "1.0.0",
    "description": "API 描述（可选）"
  },
  "tags": [
    { "name": "用户管理", "description": "用户相关接口" }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "获取用户列表",
        "tags": ["用户管理"],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": { "type": "integer" }
          }
        ],
        "responses": {
          "200": {
            "description": "成功",
            "content": {
              "application/json": {
                "schema": { "type": "object" }
              }
            }
          }
        }
      }
    }
  }
}
```

### OpenAPI 3.0 导入

通过 `adapters/openapi.ts` 自动将 OpenAPI 3.x 规范转换为内部 `ApiSpec` 格式。

## 🔧 配置

### fresh.config.ts

```typescript
import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";

export default defineConfig({
  server: {
    port: 8080,
    hostname: "0.0.0.0",
  },
  plugins: [tailwind()],
});
```

### 环境变量

- `PORT` — 服务端口（默认：8080）

### Deno 权限

由于使用了 `-A` (allow all) 快捷方式，无需单独配置权限。如需更严格控制：

```bash
deno run --allow-net --allow-read --allow-env main.ts
```

## 📦 部署

### 方式一：直接运行

```bash
deno task build
deno task preview
```

### 方式二：Docker

```dockerfile
FROM denoland/deno:alpine-2.0.0

WORKDIR /app

COPY . .

RUN deno task build

EXPOSE 8080

CMD ["task", "preview"]
```

### 方式三：Deno Deploy

Fresh 原生支持 [Deno Deploy](https://deno.com/deploy)，只需关联 GitHub 仓库即可自动部署。

## 🔀 与其他分支的对比

本项目有三个功能分支，分别代表不同的技术选型：

| 特性 | model-a | model-b | model-c (本分支) |
|------|---------|---------|-----------------|
| 后端运行时 | Node.js + Express | Deno 原生 | Deno + Fresh |
| 前端框架 | React + Vite | React + Vite | Preact + Fresh Islands |
| 架构模式 | SPA + API Server | SPA + API Server | SSR + Islands |
| 首屏性能 | 需加载 JS bundle | 需加载 JS bundle | 静态 HTML，按需水合 |
| SEO | 需额外配置 | 需额外配置 | 原生 SSR 友好 |
| 路由 | Express Router | URLPattern | Fresh File-based |
| 包管理 | npm | Deno imports + npm | Deno JSR + ESM |
| 构建工具 | Vite + tsc | Vite | Fresh 内置（无需配置） |

## 🧪 测试

```bash
# 运行所有测试
deno task test

# 运行特定测试
deno test --allow-net tests/integration_test.ts
```

测试覆盖：

- `parser_test.ts` — 类型守卫和解析逻辑
- `generator_test.ts` — ApiSpec → DocNode 转换
- `renderer_test.ts` — 三种格式渲染
- `openapi_test.ts` — OpenAPI 适配器
- `integration_test.ts` — 端到端 API 测试

## 📚 进一步阅读

- [Fresh 官方文档](https://fresh.deno.dev/docs/introduction)
- [Preact 官方文档](https://preactjs.com/)
- [Islands Architecture 详解](https://fresh.deno.dev/docs/concepts/islands)
- [项目白皮书](./docs/api-doc-generator-whitepaper.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Deno](https://deno.land/) — 现代 JavaScript/TypeScript 运行时
- [Fresh](https://fresh.deno.dev/) — 全栈 Web 框架
- [Preact](https://preactjs.com/) — 快速 3KB React 替代方案
- [Tailwind CSS](https://tailwindcss.com/) — 实用优先的 CSS 框架
