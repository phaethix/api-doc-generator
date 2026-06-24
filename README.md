## API Doc Generator

<div align="center">

**Full-stack API documentation generator built with Deno + React**

Generate beautiful Markdown / HTML / JSON docs from OpenAPI specs or custom API definitions

[![Deno](https://img.shields.io/badge/Deno-2.x-000000?style=flat&logo=deno)](https://deno.land)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat)](LICENSE)

[中文文档](docs/README.zh-CN.md)

</div>

### ✨ Features

- **Multi-format output** — Markdown, HTML, and JSON
- **OpenAPI support** — Import OpenAPI 3.0 / Swagger specs
- **AI-powered generation** — Generate OpenAPI specs from natural language via LLM
- **Type-safe** — Full TypeScript with strict mode across all modules
- **Full-stack** — Deno backend + React frontend, single deployment
- **RESTful API** — Complete HTTP interface including AI endpoints
- **Modern UI** — Tailwind CSS with dark mode, AI and standard modes
- **Streaming support** — Streaming AI generation with real-time feedback
- **Structured output** — AI generates strictly valid OpenAPI 3.0 JSON via JSON Schema

### 🖼️ Preview

<table>
  <tr>
    <td align="center" width="50%">
      <img src="assets/screenshots/frontend-main.png" /><br/>
      <em>Main Mode</em>
    </td>
    <td align="center" width="50%">
      <img src="assets/screenshots/frontend-ai.png" /><br/>
      <em>AI Mode</em>
    </td>
  </tr>
</table>

### 🏗️ Architecture

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#F1F5F9', 'primaryTextColor': '#1E293B', 'primaryBorderColor': '#CBD5E0', 'lineColor': '#94A3B8', 'secondaryColor': '#FFFFFF', 'tertiaryColor': '#F8FAFC'}}}%%
flowchart LR
    subgraph FE["React SPA"]
        Editor[JsonEditor]
        Output[OutputPanel]
        AIPanel[AI Panel]
    end

    subgraph BE["Deno Backend"]
        Route{{URLPattern<br/>Router}}
        subgraph Pipeline["Core Pipeline"]
            P[Parser] --> G[Generator] --> R[Renderer]
        end
        Adapter[(OpenAPI<br/>Adapter)]
        AIHandler[AI<br/>Handlers]
    end

    subgraph GenAI["GenAI Module"]
        Client[LLMClient]
        Provider[ChatCompletions<br/>Provider]
        Schema[JSON Schemas]
    end

    FE -->|POST /generate| Route
    FE -->|POST /ai/*| Route
    Route --> P
    Route -.->|/import/openapi| Adapter
    Route -.->|/ai/*| AIHandler
    Adapter --> G
    AIHandler --> Client
    Client --> Provider
    Provider -->|LLM API| Ext[External<br/>LLM API]
    Schema --> Client
    R -.->|Response| FE

    style FE fill:#F8FAFC,stroke:#CBD5E0,stroke-width:1px,color:#1E293B
    style BE fill:#F8FAFC,stroke:#CBD5E0,stroke-width:1px,color:#1E293B
    style GenAI fill:#F8FAFC,stroke:#CBD5E0,stroke-width:1px,color:#1E293B
    style Pipeline fill:#FFFFFF,stroke:#E2E8F0,stroke-width:1px,color:#1E293B
    classDef nodeFe fill:#F1F5F9,stroke:#64748B,color:#1E293B,stroke-width:1px
    classDef nodeBe fill:#334155,stroke:#1E293B,color:#F8FAFC,stroke-width:1px
    classDef nodePipe fill:#E2E8F0,stroke:#94A3B8,color:#1E293B,stroke-width:1px
    classDef nodeGenAI fill:#E2E8F0,stroke:#94A3B8,color:#1E293B,stroke-width:1px
    class Editor,Output,AIPanel nodeFe
    class Route,AIHandler nodeBe
    class P,G,R nodePipe
    class Client,Provider,Schema nodeGenAI
```



### 🚀 Quick Start

#### Prerequisites

- Deno 2.x
- Node.js 18+

#### One-command setup

```bash
./scripts/dev.sh start      # Start both frontend & backend
./scripts/dev.sh status     # Check status
./scripts/dev.sh stop      # Stop services
./scripts/dev.sh restart   # Restart
```

Visit http://localhost:8080

#### Manual setup

```bash
# Build frontend
cd frontend && npm install && npm run build && cd ..

# Start backend
cd backend && deno task start
```

### 📖 API Usage

#### Generate documentation

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

#### Import OpenAPI

```bash
POST /import/openapi?format=markdown
# Send OpenAPI 3.0 JSON directly
```

#### AI: Ping (test LLM connection)

```bash
POST /ai/ping
# → { "ok": true, "reply": "...", "model": "...", "usage": {...} }
```

#### AI: Generate OpenAPI from natural language

```bash
POST /ai/generate-openapi
Content-Type: application/json

{
  "description": "User management system with list users and get user by ID",
  "scope": "document"
}

# → { "ok": true, "openapi": {...}, "scope": "document", "usage": {...}, "format_used": "json_schema" }
```

#### AI: Streaming generation

```bash
POST /ai/generate-openapi-stream
# Server-Sent Events stream of generation progress
```

#### Health check

```bash
GET /health
# → { "status": "ok", "timestamp": "..." }
```

### 🧪 Testing

```bash
cd backend
deno test --allow-net --allow-read --allow-env
```

### 📦 Deployment

#### Docker

```bash
docker-compose up --build

# Or build manually
docker build -t api-doc-generator .
docker run -p 8080:8080 api-doc-generator
```

### 🔧 Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Server port |
| `HOST` | 0.0.0.0 | Server host |
| `OPENAI_API_KEY` | - | LLM API key (for AI features) |
| `OPENAI_BASE_URL` | `https://apihub.agnes-ai.com/v1` | LLM API base URL |
| `LLM_MODEL` | `agnes-2.0-flash` | LLM model name |
| `LOG_LEVEL` | `info` | Log level |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,...` | CORS allowed origins |

Copy `config/env.example` to `.env` and modify as needed.

### 🤝 Contributing

Issues and PRs are welcome!

### 📄 License

MIT
