# API 文档生成器 (API Doc Generator)

> 🌿 **分支**: `feature/model-b-fullstack` — Deno + React SPA 实现方案

一个基于 **Deno + React** 的全栈 API 文档生成工具，支持从 API 规范一键生成精美的 Markdown / HTML / JSON 文档。

## ✨ 特性

- 🚀 **全栈一体**：Deno 后端 + React 前端，单一部署，开箱即用
- 🎨 **现代 UI**：使用 Tailwind CSS 构建，简洁美观的响应式界面
- 📝 **多格式输出**：支持 Markdown、HTML、JSON 三种文档格式
- 🔌 **OpenAPI 支持**：可直接导入 OpenAPI 3.0 / Swagger 规范
- 🌐 **RESTful API**：提供完整的 HTTP API 接口（generate、health、import/openapi、static）
- ⚡ **高性能**：Deno 原生运行，零依赖，启动迅速
- 🛡️ **类型安全**：全 TypeScript 编写，端到端类型安全
- 🔄 **热重载**：后端 deno task dev + 前端 Vite HMR

## 🏗️ 核心架构

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (http://localhost:5173 or 8080)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React SPA (Vite + Tailwind CSS)                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │   │
│  │  │ Header       │  │ JsonEditor   │  │ OutputPanel│ │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │   │
│  │  │ FormatSelect │  │ Toast        │  │ ...       │ │   │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │ fetch
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Deno Backend (http://localhost:8080)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Router (URLPattern)                                 │   │
│  │  /api/health  /api/generate  /api/import/openapi    │   │
│  └──────────────┬──────────────────────────────────────┘   │
│                 ▼                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Handlers                                            │   │
│  │  generate.ts | health.ts | openapi.ts | static.ts    │   │
│  └──────────────┬──────────────────────────────────────┘   │
│                 ▼                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Core Pipeline                                        │   │
│  │  ┌─────────┐  ┌────────────┐  ┌──────────────────┐  │   │
│  │  │ Parser  │→ │ Generator  │→ │ Renderer         │  │   │
│  │  │ 类型守卫 │  │ ApiSpec→   │  │ DocNode→         │  │   │
│  │  │ 验证     │  │ DocNode    │  │ md/html/json     │  │   │
│  │  └─────────┘  └────────────┘  └──────────────────┘  │   │
│  └──────────────┬──────────────────────────────────────┘   │
│                 ▼                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Adapters                                            │   │
│  │  openapi.ts — OpenAPI 3.x → ApiSpec 转换             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

```
JSON Spec (OpenAPI or custom)
    │
    ▼
┌─────────────────┐    无效 → 400 + error JSON
│ Parser (校验)    │
└────────┬─────────┘
         │ ApiSpec
         ▼
┌─────────────────┐
│ Generator       │  扁平化 paths → 按 tag 分组 → DocNode
└────────┬─────────┘
         │ DocNode
         ▼
┌─────────────────┐
│ Renderer        │  format=markdown | html | json
└────────┬─────────┘
         │
         ▼
   HTTP Response (text/markdown | text/html | application/json)
```

## 🏗️ 技术栈

### 后端
- **Deno** 1.40+ — 现代 JavaScript/TypeScript 运行时
- **TypeScript** (strict mode) — 类型安全的 JavaScript
- **URLPattern** — 原生路由匹配
- **@std/media-types** — MIME 类型处理

### 前端
- **React 18** — 主流前端框架
- **TypeScript** — 类型安全
- **Vite 5** — 快速的构建工具
- **Tailwind CSS 3** — 实用优先的 CSS 框架
- **React Router** — 客户端路由

## 📁 项目结构

```
api-doc-generator/
├── main.ts                 # Deno 应用入口
├── router.ts               # URLPattern 路由配置
├── deno.json               # Deno 配置 + tasks
├── deno.lock               # 依赖锁定
├── handlers/               # HTTP 请求处理器
│   ├── generate.ts         # /api/generate 文档生成
│   ├── health.ts           # /api/health 健康检查
│   ├── openapi.ts          # /api/import/openapi OpenAPI 导入
│   └── static.ts           # 静态文件服务
├── core/                   # 核心业务逻辑
│   ├── generator.ts        # ApiSpec → DocNode 转换
│   ├── parser.ts           # 类型守卫与解析
│   └── renderer.ts         # DocNode → 文档渲染
├── adapters/               # 适配器
│   └── openapi.ts          # OpenAPI 3.x → ApiSpec 转换
├── middleware/             # 中间件
│   └── logger.ts           # 请求日志
├── types/                  # 类型定义
│   ├── api_spec.ts         # ApiSpec 类型
│   └── doc_node.ts         # DocNode 类型
├── tests/                  # 测试文件
│   ├── generator_test.ts
│   ├── integration_test.ts
│   ├── openapi_test.ts
│   ├── parser_test.ts
│   ├── renderer_test.ts
│   └── static_test.ts
└── frontend/               # React 前端 (独立 Vite 项目)
    ├── src/
    │   ├── App.tsx         # 主应用组件
    │   ├── main.tsx        # 入口文件
    │   ├── index.css       # Tailwind 样式
    │   ├── types.ts        # 前端类型
    │   ├── api/
    │   │   └── client.ts   # API 客户端
    │   ├── components/
    │   │   ├── Header.tsx
    │   │   ├── JsonEditor.tsx
    │   │   ├── FormatSelector.tsx
    │   │   ├── OutputPanel.tsx
    │   │   └── Toast.tsx
    │   └── utils/
    │       ├── markdown.ts # Markdown 渲染
    │       └── sample.ts   # 示例数据
    ├── index.html
    ├── package.json
    ├── vite.config.ts      # 含 proxy 到后端
    ├── tailwind.config.js
    └── tsconfig.json
```

## 🚀 快速开始

### 前置要求

- [Deno](https://deno.land/) 1.40+
- [Node.js](https://nodejs.org/) 18+ (用于前端构建)
- npm 9+

### 安装与运行

#### 1. 克隆项目

```bash
git clone <your-repo-url>
cd api-doc-generator
```

#### 2. 构建前端

```bash
cd frontend
npm install
npm run build
cd ..
```

#### 3. 启动后端服务

```bash
deno run --allow-net --allow-read --allow-env main.ts
```

或者使用任务命令：

```bash
deno task start
```

服务将在 `http://localhost:8080` 启动。

#### 4. 访问应用

打开浏览器访问 `http://localhost:8080`，即可使用 API 文档生成器。

### 开发模式

#### 后端热重载

```bash
deno task dev
```

#### 前端开发服务器（带热更新）

```bash
cd frontend
npm run dev
```

前端开发服务器将在 `http://localhost:5173` 运行，并自动代理 API 请求到后端 `http://localhost:8080`。

## 📖 使用指南

### Web 界面

1. 打开 `http://localhost:8080`（或开发模式 `http://localhost:5173`）
2. 在 JSON 编辑器中输入 API 规范（自定义格式或 OpenAPI 3.0）
3. 点击「示例」按钮加载示例数据
4. 选择输出格式（Markdown / HTML / JSON）
5. 点击「生成文档」按钮
6. 查看右侧输出结果，支持复制和下载

### REST API

#### 健康检查

```bash
GET /api/health
```

响应：
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### 生成文档

```bash
POST /api/generate?format=markdown|html|json
Content-Type: application/json

{
  "info": {
    "title": "My API",
    "version": "1.0.0",
    "description": "API 描述"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "获取用户列表",
        "responses": {
          "200": { "description": "成功" }
        }
      }
    }
  }
}
```

**curl 示例**：
```bash
curl -X POST 'http://localhost:8080/api/generate?format=markdown' \
  -H 'Content-Type: application/json' \
  -d '{"info":{"title":"My API","version":"1.0.0"},"paths":{"/users":{"get":{"summary":"List users","responses":{"200":{"description":"OK"}}}}}}'
```

#### 导入 OpenAPI

```bash
POST /api/import/openapi?format=markdown
Content-Type: application/json

{
  "openapi": "3.0.0",
  "info": {
    "title": "Pet Store",
    "version": "1.0.0"
  },
  "paths": {
    "/pets": {
      "get": {
        "summary": "获取宠物列表",
        "responses": {
          "200": { "description": "成功" }
        }
      }
    }
  }
}
```

## 🧪 测试

运行所有测试：

```bash
deno test --allow-net --allow-read
```

运行特定测试：

```bash
deno test --allow-net --allow-read tests/integration_test.ts
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
  "servers": [
    { "url": "https://api.example.com", "description": "生产环境" }
  ],
  "tags": [
    { "name": "用户管理", "description": "用户相关接口" }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "获取用户列表",
        "description": "详细描述",
        "tags": ["用户管理"],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "description": "页码",
            "schema": { "type": "integer" }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "type": "object" }
            }
          }
        },
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

直接粘贴标准的 OpenAPI 3.0 规范 JSON，系统会自动转换为内部文档格式。

## 🔧 配置

### 环境变量

- `PORT` — 服务端口（默认：8080）

### Deno 权限

运行应用需要以下权限：

- `--allow-net` — 网络访问
- `--allow-read` — 读取静态文件
- `--allow-env` — 读取环境变量

## 📦 部署

### 生产构建

```bash
# 构建前端
cd frontend && npm run build && cd ..

# 启动服务
deno run --allow-net --allow-read --allow-env main.ts
```

### Docker 部署（可选）

```dockerfile
FROM denoland/deno:alpine-1.40.0

WORKDIR /app

# 复制项目文件
COPY . .

# 构建前端
RUN cd frontend && npm install && npm run build

# 暴露端口
EXPOSE 8080

# 启动应用
CMD ["run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]
```

## 🔀 与其他分支的对比

本项目有三个功能分支，分别代表不同的技术选型：

| 特性 | model-a | model-b (本分支) | model-c |
|------|---------|-----------------|---------|
| 后端运行时 | Node.js + Express | Deno 原生 | Deno + Fresh |
| 前端框架 | React + Vite | React + Vite | Preact + Fresh Islands |
| 路由 | Express Router | URLPattern | Fresh File-based Routes |
| 类型系统 | TypeScript | TypeScript | TypeScript |
| 包管理 | npm | Deno imports + npm (frontend) | Deno JSR |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Deno](https://deno.land/) — 现代 JavaScript/TypeScript 运行时
- [React](https://react.dev/) — 用户界面构建库
- [Vite](https://vitejs.dev/) — 下一代前端构建工具
- [Tailwind CSS](https://tailwindcss.com/) — 实用优先的 CSS 框架
