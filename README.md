# API 文档生成器 (API Doc Generator)

> 🌿 **分支**: `feature/model-b-fullstack` — Deno + React SPA 实现方案

一个基于 **Deno + React** 的全栈 API 文档生成工具，支持从 API 规范一键生成精美的 Markdown / HTML / JSON 文档。

## 📑 目录

- [✨ 特性](#-特性)
- [🏗️ 核心架构](#️-核心架构)
  - [数据流](#数据流)
- [🏗️ 技术栈](#️-技术栈)
- [📁 项目结构](#-项目结构)
  - [后端模块依赖关系](#后端模块依赖关系)
  - [前端组件关系](#前端组件关系)
- [🚀 快速开始](#-快速开始)
  - [开发工作流](#开发工作流)
- [📖 使用指南](#-使用指南)
- [🧪 测试](#-测试)
  - [测试架构](#测试架构)
  - [测试金字塔](#测试金字塔)
- [📝 API 规范](#-api-规范)
  - [核心数据模型](#核心数据模型)
- [🔧 配置](#-配置)
  - [配置加载流程](#配置加载流程)
  - [输出格式对比](#输出格式对比)
- [📦 部署](#-部署)
  - [部署架构](#部署架构)
  - [CI/CD 流水线](#cicd-流水线)
- [🔀 与其他分支的对比](#️-与其他分支的对比)
- [🤝 贡献](#-贡献)
- [📄 许可证](#-许可证)

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

系统采用前后端分离的全栈架构，前端负责交互与展示，后端承担文档生成的核心逻辑。

```mermaid
graph TB
    subgraph Browser["🌐 Browser (localhost:5173 / 8080)"]
        subgraph SPA["React SPA (Vite + Tailwind CSS)"]
            Header["Header<br/>顶部导航"]
            JsonEditor["JsonEditor<br/>规范编辑器"]
            FormatSelect["FormatSelector<br/>格式选择"]
            OutputPanel["OutputPanel<br/>结果展示"]
            Toast["Toast<br/>消息提示"]
            ErrorBoundary["ErrorBoundary<br/>错误边界"]
        end
    end

    subgraph Backend["🦕 Deno Backend (localhost:8080)"]
        subgraph Router["Router (URLPattern)"]
            Routes["/api/health<br/>/api/generate<br/>/api/import/openapi<br/>/static/*"]
        end

        subgraph Handlers["Handlers Layer"]
            GenerateH["generate.ts"]
            HealthH["health.ts"]
            OpenAPIH["openapi.ts"]
            StaticH["static.ts"]
        end

        subgraph Core["Core Pipeline"]
            Parser["Parser<br/>类型守卫 + 校验"]
            Generator["Generator<br/>ApiSpec → DocNode"]
            Renderer["Renderer<br/>md / html / json"]
        end

        subgraph Adapters["Adapters"]
            OpenAPIAdapter["openapi.ts<br/>OpenAPI 3.x → ApiSpec"]
        end

        subgraph Middleware["Middleware"]
            Logger["logger.ts<br/>请求日志"]
        end
    end

    SPA -->|fetch /api/*| Router
    Router --> Logger
    Logger --> GenerateH
    Logger --> HealthH
    Logger --> OpenAPIH
    Logger --> StaticH
    GenerateH --> Parser
    GenerateH --> Generator
    GenerateH --> Renderer
    OpenAPIH --> OpenAPIAdapter
    OpenAPIAdapter --> Generator
    Parser --> Generator
    Generator --> Renderer
    Renderer -->|HTTP Response| SPA
```

### 数据流

完整的文档生成请求链路如下：

```mermaid
flowchart LR
    A[JSON Spec<br/>OpenAPI / 自定义] --> B{Parser<br/>类型校验}
    B -->|无效| C[400 Error<br/>JSON]
    B -->|有效| D[ApiSpec<br/>类型化对象]
    D --> E[Generator<br/>路径扁平 + Tag 分组]
    E --> F["DocNode[]<br/>结构化文档树"]
    F --> G{Renderer<br/>格式选择}
    G -->|markdown| H[text/markdown]
    G -->|html| I[text/html]
    G -->|json| J[application/json]
    H --> K[HTTP Response]
    I --> K
    J --> K
    K --> L[前端 OutputPanel<br/>渲染/复制/下载]
```

请求/响应的详细时序：

```mermaid
sequenceDiagram
    participant U as 用户
    participant FE as React 前端
    participant BE as Deno 后端
    participant P as Parser
    participant G as Generator
    participant R as Renderer

    U->>FE: 输入 JSON + 选择格式
    FE->>BE: POST /api/generate?format=markdown
    BE->>BE: Middleware 记录请求日志
    BE->>P: parse(body)
    alt 校验失败
        P-->>BE: 抛出 ParseError
        BE-->>FE: 400 + error JSON
        FE-->>U: Toast 显示错误
    else 校验成功
        P-->>BE: ApiSpec
        BE->>G: generate(ApiSpec)
        G-->>BE: "DocNode[]"
        BE->>R: render("DocNode[]", format)
        R-->>BE: string
        BE-->>FE: 200 OK + 文档内容
        FE->>FE: OutputPanel 高亮渲染
        FE-->>U: 展示生成结果
    end
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
├── backend/                 # Deno 后端
│   ├── main.ts             # 应用入口
│   ├── router.ts           # URLPattern 路由配置
│   ├── deno.json           # Deno 配置 + tasks
│   ├── deno.lock           # 依赖锁定
│   ├── handlers/           # HTTP 请求处理器
│   │   ├── generate.ts     # /api/generate 文档生成
│   │   ├── health.ts       # /api/health 健康检查
│   │   ├── openapi.ts      # /api/import/openapi OpenAPI 导入
│   │   └── static.ts       # 静态文件服务
│   ├── core/               # 核心业务逻辑
│   │   ├── generator.ts    # ApiSpec → DocNode 转换
│   │   ├── parser.ts       # 类型守卫与解析
│   │   └── renderer.ts     # DocNode → 文档渲染
│   ├── adapters/           # 适配器
│   │   └── openapi.ts      # OpenAPI 3.x → ApiSpec 转换
│   ├── middleware/         # 中间件
│   │   └── logger.ts       # 请求日志
│   ├── types/              # 类型定义
│   │   ├── api_spec.ts     # ApiSpec 类型
│   │   └── doc_node.ts     # DocNode 类型
│   └── tests/              # 测试文件
│       ├── generator_test.ts
│       ├── integration_test.ts
│       ├── openapi_test.ts
│       ├── parser_test.ts
│       ├── renderer_test.ts
│       └── static_test.ts
│
├── frontend/               # React 前端 (独立 Vite 项目)
│   ├── src/
│   │   ├── App.tsx         # 主应用组件
│   │   ├── main.tsx        # 入口文件
│   │   ├── index.css       # Tailwind 样式
│   │   ├── types.ts        # 前端类型
│   │   ├── api/
│   │   │   └── client.ts   # API 客户端
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── JsonEditor.tsx
│   │   │   ├── FormatSelector.tsx
│   │   │   ├── OutputPanel.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   └── utils/
│   │       ├── markdown.ts # Markdown 渲染
│   │       └── sample.ts   # 示例数据
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts      # 含 proxy 到后端
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── scripts/                # 脚本目录
│   └── dev.sh              # 开发环境管理脚本
│
├── config/                 # 配置目录
│   └── env.example         # 环境变量模板
│
├── examples/               # 示例文件
│   └── openapi/
│       └── petstore.json   # OpenAPI 示例
│
├── docs/                   # 文档目录
│
├── Dockerfile              # Docker 配置
├── docker-compose.yml      # Docker Compose 配置
├── .dockerignore           # Docker 忽略文件
└── README.md               # 项目说明
```

### 后端模块依赖关系

```mermaid
graph LR
    main["main.ts"] --> router["router.ts"]
    main --> middleware["middleware/logger.ts"]
    router --> gen_h["handlers/generate.ts"]
    router --> health_h["handlers/health.ts"]
    router --> openapi_h["handlers/openapi.ts"]
    router --> static_h["handlers/static.ts"]

    gen_h --> parser["core/parser.ts"]
    gen_h --> generator["core/generator.ts"]
    gen_h --> renderer["core/renderer.ts"]
    openapi_h --> openapi_adapter["adapters/openapi.ts"]
    openapi_adapter --> generator

    parser --> types_spec["types/api_spec.ts"]
    generator --> types_spec
    generator --> types_doc["types/doc_node.ts"]
    renderer --> types_doc

    static_h -.->|serve| dist["frontend/dist/*"]
```

### 前端组件关系

```mermaid
graph TB
    App["App.tsx<br/>根组件"] --> ErrorBoundary["ErrorBoundary"]
    ErrorBoundary --> Header["Header"]
    ErrorBoundary --> JsonEditor["JsonEditor"]
    ErrorBoundary --> FormatSelector["FormatSelector"]
    ErrorBoundary --> OutputPanel["OutputPanel"]
    ErrorBoundary --> Toast["Toast"]

    App --> ThemeProvider["暗色模式 Provider"]
    App --> ApiClient["api/client.ts"]

    OutputPanel -->|使用| highlightJson["JSON 语法高亮"]
    JsonEditor -->|使用| monaco["代码编辑器"]
    App -->|加载| sample["utils/sample.ts"]
```

## 🚀 快速开始

本项目提供了一个便捷的开发环境管理脚本 `scripts/dev.sh`，可以一键启动、停止前后端服务。

```bash
# 启动前后端（自动检测并安装依赖）
./scripts/dev.sh start

# 查看服务状态
./scripts/dev.sh status

# 停止所有服务
./scripts/dev.sh stop

# 重启所有服务
./scripts/dev.sh restart

# 仅启动/停止后端
./scripts/dev.sh start:backend
./scripts/dev.sh stop:backend

# 仅启动/停止前端
./scripts/dev.sh start:frontend
./scripts/dev.sh stop:frontend

# 查看实时日志
./scripts/dev.sh logs backend    # 后端日志
./scripts/dev.sh logs frontend   # 前端日志

# 清理日志和 PID 文件
./scripts/dev.sh clean

# 查看所有命令
./scripts/dev.sh help
```

启动后访问：
- 前端: http://localhost:5173
- 后端: http://localhost:8080

### 开发工作流

```mermaid
stateDiagram-v2
    [*] --> 克隆代码: git clone
    克隆代码 --> 安装依赖: cd frontend && npm install
    安装依赖 --> 开发模式: ./scripts/dev.sh start

    开发模式 --> 编辑前端: 修改 frontend/src/*
    开发模式 --> 编辑后端: 修改 backend/**/*.ts

    编辑前端 --> HMR更新: Vite 热更新
    编辑后端 --> 自动重启: Deno file watcher

    HMR更新 --> 验证效果: 浏览器刷新
    自动重启 --> 验证效果: 重新请求 API

    验证效果 --> 测试通过?: 功能正常?
    测试通过? --> 编辑前端: 否 - 继续修改
    测试通过? --> 提交代码: 是

    提交代码 --> 运行测试: deno test
    运行测试 --> 通过?: 所有测试?
    通过? --> 推送分支: 是
    通过? --> 修复问题: 否
    修复问题 --> 运行测试

    推送分支 --> 创建PR: git push
    创建PR --> [*]: code review + merge
```

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
cd backend
deno run --allow-net --allow-read --allow-env main.ts
```

或者使用任务命令：

```bash
cd backend
deno task start
```

服务将在 `http://localhost:8080` 启动。

#### 4. 访问应用

打开浏览器访问 `http://localhost:8080`，即可使用 API 文档生成器。

### 开发模式

#### 后端热重载

```bash
cd backend
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

### 测试架构

```mermaid
graph TB
    subgraph Tests["backend/tests/"]
        UnitParser["parser_test.ts<br/>类型校验"]
        UnitGen["generator_test.ts<br/>文档生成"]
        UnitRenderer["renderer_test.ts<br/>格式渲染"]
        OpenAPITest["openapi_test.ts<br/>OpenAPI 适配"]
        StaticTest["static_test.ts<br/>静态服务"]
        Integration["integration_test.ts<br/>端到端测试"]
    end

    UnitParser --> Parser["core/parser.ts"]
    UnitGen --> Generator["core/generator.ts"]
    UnitRenderer --> Renderer["core/renderer.ts"]
    OpenAPITest --> Adapter["adapters/openapi.ts"]
    StaticTest --> StaticH["handlers/static.ts"]
    Integration -->|HTTP Request| Main["main.ts"]

    TestRunner["deno test<br/>内置测试运行器"] -.-> Tests
```

### 测试金字塔

```mermaid
graph TB
    E2E["🔺 端到端测试<br/>integration_test.ts<br/>验证完整请求链路"]
    Integration["🔶 集成测试<br/>openapi_test.ts<br/>static_test.ts<br/>验证模块协作"]
    Unit["🔹 单元测试<br/>parser_test.ts<br/>generator_test.ts<br/>renderer_test.ts<br/>验证单一职责"]

    E2E --- Integration --- Unit

    Count["数量关系:<br/>E2E: 1-2 个<br/>Integration: 2-3 个<br/>Unit: 6+ 个"]
```

运行所有测试：

```bash
cd backend
deno test --allow-net --allow-read
```

运行特定测试：

```bash
cd backend
deno test --allow-net --allow-read tests/integration_test.ts
```

## 📝 API 规范

### 核心数据模型

```mermaid
erDiagram
    API_SPEC ||--|| INFO : contains
    API_SPEC ||--o{ SERVER : has
    API_SPEC ||--o{ TAG : has
    API_SPEC ||--o{ PATH : contains
    PATH ||--o{ OPERATION : has
    OPERATION ||--o{ PARAMETER : has
    OPERATION ||--o| REQUEST_BODY : optional
    OPERATION ||--o{ RESPONSE : has

    DOC_NODE ||--o{ DOC_NODE : nested

    API_SPEC {
        string title
        string version
        string description
    }

    PATH {
        string path
        string method
    }

    OPERATION {
        string summary
        string description
        boolean deprecated
    }

    DOC_NODE {
        string kind
        string title
        string content
    }
```

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

复制 `config/env.example` 为 `.env` 并按需修改：

```bash
cp config/env.example .env
```

可用配置项：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 8080 | 服务端口 |
| `HOST` | 0.0.0.0 | 服务主机地址 |
| `DENO_ENV` | development | 运行环境 |
| `LOG_LEVEL` | info | 日志级别 |
| `CORS_ALLOWED_ORIGINS` | http://localhost:5173 | CORS 允许的来源 |

### Deno 权限

运行应用需要以下权限：

- `--allow-net` — 网络访问
- `--allow-read` — 读取静态文件
- `--allow-env` — 读取环境变量

### 配置加载流程

```mermaid
flowchart TD
    A[启动应用<br/>deno run main.ts] --> B[读取 config/env.example]
    B --> C[加载 .env 文件<br/>如果存在]
    C --> D{环境变量<br/>优先级判断}
    D -->|系统环境变量| E[使用系统值]
    D -->|.env 覆盖| F[使用 .env 值]
    D -->|默认值| G[使用代码默认值]

    E --> H[PORT]
    E --> I[HOST]
    E --> J[DENO_ENV]
    E --> K[LOG_LEVEL]
    E --> L[CORS_ALLOWED_ORIGINS]

    F --> H
    G --> H

    H --> M[初始化 HTTP Server]
    I --> M
    J --> M
    M --> N[启动监听<br/>HOST:PORT]
```

### 输出格式对比

| 维度 | Markdown | HTML | JSON |
|------|----------|------|------|
| **MIME Type** | `text/markdown` | `text/html` | `application/json` |
| **用途** | 文档系统、Wiki、Git 仓库 | 浏览器直接查看 | 程序处理、API 响应 |
| **样式** | 纯文本 + 标记 | 内联 CSS 美化 | 无样式，结构化数据 |
| **可读性** | 高（人类友好） | 最高（可视化） | 中（需要解析） |
| **可移植性** | 极高 | 高 | 极高 |
| **生成复杂度** | 低 | 中 | 低 |

```mermaid
pie title 输出格式适用场景
    "Markdown (文档站点)" : 40
    "HTML (浏览器预览)" : 35
    "JSON (API 集成)" : 25
```

## 📦 部署

### 生产构建

```bash
# 构建前端
cd frontend && npm run build && cd ..

# 启动服务
cd backend
deno run --allow-net --allow-read --allow-env main.ts
```

### Docker 部署

项目包含完整的 Docker 配置，可以直接使用：

```bash
# 使用 docker-compose 一键启动
docker-compose up --build

# 或手动构建
docker build -t api-doc-generator .
docker run -p 8080:8080 api-doc-generator
```

#### 部署架构

**单机 Docker 部署**:

```mermaid
graph LR
    subgraph Host["宿主机 (Docker)"]
        subgraph Container["api-doc-generator 容器"]
            Nginx["Deno 主进程<br/>:8080"]
            Nginx --> Static["静态文件<br/>frontend/dist/"]
            Nginx --> API["API 路由<br/>/api/*"]
        end
    end

    User["用户浏览器"] -->|HTTP :8080| Host
    Host -->|返回 HTML/MD/JSON| User
```

**docker-compose 多服务架构**:

```mermaid
graph TB
    subgraph External["Internet / LAN"]
        User["开发者 / 文档使用者"]
    end

    subgraph DockerNet["docker network: api-doc"]
        subgraph AppContainer["api-doc-generator"]
            App["Deno Backend<br/>:8080"]
            App -->|serve| Static["frontend/dist/*"]
        end

        subgraph Volumes["Volumes"]
            Logs["logs/"]
            EnvFile[".env"]
        end
    end

    User -->|8080| App
    EnvFile -.->|mount| App
    App -->|写入| Logs
```

### CI/CD 流水线

```mermaid
flowchart LR
    A[开发者推送代码] --> B[Git Hook / Webhook]
    B --> C{运行测试<br/>deno test}
    C -->|失败| D[通知开发者]
    C -->|通过| E[构建前端<br/>npm run build]
    E --> F[构建 Docker 镜像]
    F --> G[推送镜像仓库]
    G --> H{部署环境?}
    H -->|staging| I[部署到预发]
    H -->|production| J[部署到生产]
    I --> K[自动化验证]
    K -->|通过| J
    K -->|失败| D
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

### 技术选型对比图

```mermaid
graph TB
    subgraph ModelA["🌐 model-a 分支"]
        direction TB
        Node["Node.js 20+"] --> Express["Express.js"]
        Express --> Pug["模板引擎"]
        ReactA["React 18"] --> ViteA["Vite"]
        npmA["npm"] --> webpackA["Webpack"]
    end

    subgraph ModelB["🦕 model-b 分支 (当前)"]
        direction TB
        DenoB["Deno 2.x"] --> Router["URLPattern"]
        Router --> TS["TypeScript Strict"]
        ReactB["React 18"] --> ViteB["Vite + HMR"]
        DenoImports["Deno imports"] --> NPM["npm (frontend)"]
    end

    subgraph ModelC["⚡ model-c 分支"]
        direction TB
        DenoC["Deno 2.x"] --> Fresh["Fresh Framework"]
        Fresh --> Islands["Islands Architecture"]
        Preact["Preact"] --> Twind["Twind CSS"]
        JSR["Deno JSR"] --> Native["原生 TS"]
    end

    User["开发者"] -->|选择| Choice{偏好?}
    Choice -->|传统生态| ModelA
    Choice -->|现代化 + 原生| ModelB
    Choice -->|极致性能 + SSR| ModelC
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [Deno](https://deno.land/) — 现代 JavaScript/TypeScript 运行时
- [React](https://react.dev/) — 用户界面构建库
- [Vite](https://vitejs.dev/) — 下一代前端构建工具
- [Tailwind CSS](https://tailwindcss.com/) — 实用优先的 CSS 框架
