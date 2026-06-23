# API Doc Generator

将 OpenAPI/Swagger 规范转化为精美文档的在线工具。

## 功能特性

- 粘贴或上传 OpenAPI/Swagger JSON 规范
- 即时生成 Markdown、HTML 或 JSON 格式的 API 文档
- 支持参数、请求体、响应等完整文档结构
- 自动按标签分组
- 简洁美观的 UI 交互
- 支持 HTML 预览、JSON 格式化查看、Markdown 渲染

## 技术栈

- **前端**: React 18 + Vite 5 + Tailwind CSS 3
- **后端**: Express 4 + TypeScript 5
- **前后端一体**: 开发模式下 Vite proxy 连接后端，生产模式下 Express 同时提供 API 和静态文件
- **测试**: Vitest + tsx

## 环境要求

- Node.js 18+ 
- npm 9+

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发模式（前后端同时启动）
npm run dev
# 前端: http://localhost:5173（Vite dev server）
# 后端: http://localhost:8080（Express + tsx watch）

# 运行测试
npm test
```

## 生产构建与部署

```bash
# 构建（前端 + 后端）
npm run build

# 启动生产服务器
npm start
# 访问: http://localhost:8080
```

## API 接口

### `GET /api/health`
健康检查，返回：
```json
{ "status": "ok", "timestamp": "2024-01-01T00:00:00.000Z" }
```

### `POST /api/generate?format=markdown|html|json`
生成 API 文档。请求体为 OpenAPI/Swagger JSON 规范。

请求示例：
```bash
curl -X POST 'http://localhost:8080/api/generate?format=markdown' \
  -H 'Content-Type: application/json' \
  -d '{
    "info": { "title": "Pet Store", "version": "1.0.0" },
    "paths": {
      "/pets": {
        "get": {
          "summary": "List all pets",
          "responses": { "200": { "description": "OK" } }
        }
      }
    }
  }'
```

响应格式：

- `format=markdown` → `Content-Type: text/markdown` 返回 Markdown 文档
- `format=html` → `Content-Type: text/html` 返回 HTML 文档
- `format=json` → `Content-Type: application/json` 返回 JSON 格式的 DocNode

### 错误响应

```json
{ "error": "Invalid API spec: missing required field 'info'", "field": "info" }
```

## 项目结构

```
api-doc-generator/
├── src/
│   ├── client/                # React 前端应用
│   │   ├── index.html
│   │   ├── public/
│   │   │   └── favicon.svg
│   │   └── src/
│   │       ├── App.tsx                # 主应用组件
│   │       ├── main.tsx               # 入口
│   │       ├── index.css              # Tailwind 样式
│   │       └── components/
│   │           ├── GeneratorForm.tsx  # 输入面板
│   │           └── ResultPanel.tsx    # 结果面板
│   └── server/                # Express 后端
│       ├── index.ts                   # 服务器入口
│       ├── handlers/                  # API 路由处理器
│       │   ├── generate.ts
│       │   └── health.ts
│       ├── core/                      # 核心业务逻辑
│       │   ├── parser.ts              # 类型守卫与解析
│       │   ├── generator.ts           # ApiSpec → DocNode 转换
│       │   ├── renderer.ts            # DocNode → md/html/json 渲染
│       │   ├── parser.test.ts
│       │   ├── generator.test.ts
│       │   └── renderer.test.ts
│       ├── adapters/                  # 适配器
│       │   └── openapi.ts             # OpenAPI 3.x → ApiSpec
│       └── types/                     # TypeScript 类型定义
│           ├── api_spec.ts
│           └── doc_node.ts
├── package.json
├── tsconfig.client.json        # 前端 tsconfig
├── tsconfig.server.json        # 后端 tsconfig
├── vite.config.ts              # Vite 配置（含代理）
├── tailwind.config.js
└── vitest.config.ts
```

## 核心架构

```
┌─────────────────────────────────────────────┐
│  Frontend (React + Vite)                    │
│  ┌───────────────┐  ┌───────────────┐      │
│  │ GeneratorForm │  │  ResultPanel  │      │
│  └───────┬───────┘  └───────────────┘      │
│          │ fetch /api/generate              │
└──────────┼──────────────────────────────────┘
           │
┌──────────┼──────────────────────────────────┐
│  Backend (Express)                          │
│          ▼                                   │
│  ┌─────────────────────────────────────┐   │
│  │  Handlers (generate, health)        │   │
│  └──────────────┬──────────────────────┘   │
│                 ▼                            │
│  ┌─────────────────────────────────────┐   │
│  │  Core Pipeline                       │   │
│  │  Parser → Generator → Renderer      │   │
│  └──────────────┬──────────────────────┘   │
│                 ▼                            │
│  ┌─────────────────────────────────────┐   │
│  │  Adapters (OpenAPI 3.x)             │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 数据流

1. **Parser**: 验证并解析输入 JSON 为 `ApiSpec` 类型，提供类型守卫 (`isApiSpec`, `isOperation` 等)
2. **Generator**: 将 `ApiSpec` 扁平化为 `DocNode` 中间表示，自动按 tag 分组
3. **Renderer**: 将 `DocNode` 渲染为 Markdown / HTML / JSON 三种格式，HTML 输出经过 XSS 转义

## 开发指南

### 添加新功能

1. 在 `src/server/core/` 中实现核心逻辑
2. 在 `src/server/core/*.test.ts` 中编写测试
3. 在 `src/server/handlers/` 中添加 API 端点
4. 在 `src/client/src/components/` 中更新前端组件

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npx vitest run src/server/core/parser.test.ts

# 监听模式
npx vitest
```

## 许可证

MIT
