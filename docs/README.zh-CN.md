## API 文档生成器

<div align="center">

**基于 Deno + React 的全栈 API 文档生成工具**

支持从 API 规范一键生成 Markdown / HTML / JSON 文档

[![Deno](https://img.shields.io/badge/Deno-2.x-000000?style=flat&logo=deno)](https://deno.land)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

[English](README.md)

</div>

### ✨ 特性

- **多格式输出** — 支持 Markdown、HTML、JSON 三种格式
- **OpenAPI 支持** — 直接导入 OpenAPI 3.0 / Swagger 规范
- **类型安全** — 全 TypeScript (strict mode)
- **全栈一体** — Deno 后端 + React 前端，单一部署
- **RESTful API** — 提供完整的 HTTP 接口
- **现代 UI** — Tailwind CSS + 暗色模式

### 🏗️ 架构

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#F1F5F9', 'primaryTextColor': '#1E293B', 'primaryBorderColor': '#CBD5E0', 'lineColor': '#94A3B8', 'secondaryColor': '#FFFFFF', 'tertiaryColor': '#F8FAFC'}}}%%
flowchart LR
    subgraph FE["React SPA"]
        Editor[JsonEditor]
        Output[OutputPanel]
    end

    subgraph BE["Deno Backend"]
        Route{{URLPattern<br/>Router}}
        subgraph Pipeline["Core Pipeline"]
            P[Parser] --> G[Generator] --> R[Renderer]
        end
        Adapter[(OpenAPI<br/>Adapter)]
    end

    FE -->|POST /generate| Route
    Route --> P
    Route -.->|/import/openapi| Adapter
    Adapter --> G
    R -.->|Response| FE

    style FE fill:#F8FAFC,stroke:#CBD5E0,stroke-width:1px,color:#1E293B
    style BE fill:#F8FAFC,stroke:#CBD5E0,stroke-width:1px,color:#1E293B
    style Pipeline fill:#FFFFFF,stroke:#E2E8F0,stroke-width:1px,color:#1E293B
    classDef nodeFe fill:#F1F5F9,stroke:#64748B,color:#1E293B,stroke-width:1px
    classDef nodeBe fill:#334155,stroke:#1E293B,color:#F8FAFC,stroke-width:1px
    classDef nodePipe fill:#E2E8F0,stroke:#94A3B8,color:#1E293B,stroke-width:1px
    class Editor,Output nodeFe
    class Route nodeBe
    class P,G,R nodePipe
```

### 📁 项目结构

```
api-doc-generator/
├── backend/                # Deno 后端
│   ├── main.ts            # 入口
│   ├── router.ts          # URLPattern 路由
│   ├── handlers/          # HTTP 处理器
│   ├── core/              # Parser + Generator + Renderer
│   ├── adapters/          # OpenAPI 适配器
│   ├── middleware/        # 日志中间件
│   ├── shared/            # 共享工具
│   └── tests/
├── frontend/              # React 前端
│   ├── src/
│   │   ├── components/    # UI 组件
│   │   ├── api/           # API 客户端
│   │   └── utils/
│   └── vite.config.ts
├── scripts/dev.sh         # 开发脚本
├── Dockerfile
└── docker-compose.yml
```

### 🚀 快速开始

#### 前置要求

- Deno 2.x
- Node.js 18+

#### 一键启动

```bash
./scripts/dev.sh start      # 启动前后端
./scripts/dev.sh status     # 查看状态
./scripts/dev.sh stop       # 停止服务
./scripts/dev.sh restart    # 重启
```

访问 http://localhost:8080

#### 手动启动

```bash
# 构建前端
cd frontend && npm install && npm run build && cd ..

# 启动后端
cd backend && deno task start
```

### 📖 API 使用

#### 生成文档

```bash
POST /generate?format=markdown|html|json

curl -X POST 'http://localhost:8080/generate?format=markdown' \
  -H 'Content-Type: application/json' \
  -d '{
    "info": { "title": "My API", "version": "1.0.0" },
    "paths": {
      "/users": {
        "get": {
          "summary": "List users",
          "responses": { "200": { "description": "OK" } }
        }
      }
    }
  }'
```

#### 导入 OpenAPI

```bash
POST /import/openapi?format=markdown
# 直接发送 OpenAPI 3.0 JSON
```

#### 健康检查

```bash
GET /health
# → { "status": "ok", "timestamp": "..." }
```

### 🧪 测试

```bash
cd backend
deno test --allow-net --allow-read --allow-env
```

### 📦 部署

#### Docker

```bash
docker-compose up --build

# 或手动构建
docker build -t api-doc-generator .
docker run -p 8080:8080 api-doc-generator
```

### 🔧 配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 8080 | 服务端口 |
| `HOST` | 0.0.0.0 | 服务主机 |

### 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 📄 许可证

MIT License
