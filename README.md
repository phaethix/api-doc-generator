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
- **Type-safe** — Full TypeScript with strict mode
- **Full-stack** — Deno backend + React frontend, single deployment
- **RESTful API** — Complete HTTP interface
- **Modern UI** — Tailwind CSS with dark mode

### 🏗️ Architecture

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

### 📁 Project Structure

```
api-doc-generator/
├── backend/                # Deno backend
│   ├── main.ts            # Entry point
│   ├── router.ts          # URLPattern routes
│   ├── handlers/          # HTTP handlers
│   ├── core/              # Parser + Generator + Renderer
│   ├── adapters/          # OpenAPI adapter
│   ├── middleware/        # Logger
│   ├── shared/            # Shared utilities
│   └── tests/
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── api/           # API client
│   │   └── utils/
│   └── vite.config.ts
├── scripts/dev.sh         # Dev script
├── Dockerfile
└── docker-compose.yml
```

### 🚀 Quick Start

#### Prerequisites

- Deno 2.x
- Node.js 18+

#### One-command setup

```bash
./scripts/dev.sh start      # Start both frontend & backend
./scripts/dev.sh status     # Check status
./scripts/dev.sh stop       # Stop services
./scripts/dev.sh restart    # Restart
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

### 🤝 Contributing

Issues and PRs are welcome!

### 📄 License

MIT
