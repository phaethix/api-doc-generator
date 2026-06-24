# Contributing to API Doc Generator

Thank you for your interest in contributing! This document outlines the process for contributing to this project.

> 🌐 [中文版 (Chinese Version)](docs/CONTRIBUTING.zh-CN.md)

## Code of Conduct

This project adheres to a few simple principles:

- Be respectful and inclusive in all interactions
- Focus on constructive feedback
- Assume good faith from other contributors

## Getting Started

### Prerequisites

- [Deno 2.x](https://deno.land)
- [Node.js 18+](https://nodejs.org)
- (Optional) Docker

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/phaethix/api-doc-generator.git
cd api-doc-generator

# 2. Set up environment
cp config/env.example .env
# Edit .env and set your OPENAI_API_KEY if you plan to work on AI features

# 3. Build frontend
cd frontend && npm install && npm run build && cd ..

# 4. Start development server (backend)
cd backend && deno task start
```

You can also use the one-command setup:

```bash
./scripts/dev.sh start    # Start both frontend & backend
./scripts/dev.sh status   # Check running status
./scripts/dev.sh stop     # Stop services
```

### Project Structure

```
.
├── backend/          # Deno HTTP server
│   ├── core/         # Core pipeline (parser, generator, renderer)
│   ├── handlers/     # HTTP request handlers
│   ├── adapters/     # OpenAPI adapter
│   ├── middleware/    # Middleware (logger, etc.)
│   ├── types/        # Shared TypeScript types
│   └── tests/        # Unit and integration tests
├── frontend/         # React SPA (Vite + Tailwind CSS)
│   └── src/
│       ├── components/  # React components
│       ├── api/         # API client
│       └── utils/       # Utility functions
├── genai/            # AI generation module
│   ├── providers/    # LLM provider implementations
│   ├── schemas/      # JSON Schema definitions
│   └── tests/        # GenAI tests
├── scripts/          # Dev scripts
├── docs/             # Documentation
└── config/           # Configuration files
```

## How to Contribute

### Reporting Bugs

1. Search [existing issues](https://github.com/phaethix/api-doc-generator/issues) to avoid duplicates
2. Use the **Bug Report** issue template
3. Include:
   - Deno version (`deno --version`)
   - Node.js version (`node --version`)
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant error messages or logs

### Suggesting Features

1. Search [existing issues](https://github.com/phaethix/api-doc-generator/issues) to avoid duplicates
2. Use the **Feature Request** issue template
3. Describe the problem you're solving and why it matters
4. Check the [Roadmap](ROADMAP.md) to see if it's already planned

### Picking Up Work

Look for these labels on issues:

- [`good-first-issue`](https://github.com/phaethix/api-doc-generator/labels/good-first-issue) — Great for new contributors
- [`help-wanted`](https://github.com/phaethix/api-doc-generator/labels/help-wanted) — Open for community contributions
- [`enhancement`](https://github.com/phaethix/api-doc-generator/labels/enhancement) — New features

Always comment on an issue before starting work to let others know you're working on it.

### Development Workflow

1. **Fork** the repository
2. **Create a branch** from `main`:

   ```bash
   git checkout -b feat/my-feature
   # or: fix/my-bugfix, docs/my-docs-update, refactor/my-refactor
   ```

   Branch naming conventions:
   - `feat/` — New features
   - `fix/` — Bug fixes
   - `docs/` — Documentation changes
   - `refactor/` — Code restructuring
   - `test/` — Adding or updating tests
   - `chore/` — Maintenance tasks

3. **Make your changes** following the code style below
4. **Run tests** to ensure nothing is broken:

   ```bash
   # Backend tests
   cd backend && deno test --allow-net --allow-read --allow-env

   # GenAI tests
   cd genai && deno test --allow-net --allow-read --allow-env
   ```

5. **Commit** your changes (see commit conventions below)
6. **Push** your branch and create a Pull Request
7. Ensure the CI checks pass

### Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples:**

```
feat(genai): add streaming support for OpenAI provider
fix(frontend): correct dark mode toggle state persistence
docs(readme): update API usage examples
refactor(backend): extract response helpers to shared module
test(backend): add integration tests for /import/openapi
```

**Rules:**

- Commit messages must be in **English**
- Description should use imperative mood ("add" not "added")
- Keep the first line under 72 characters
- Reference issues with `#issue-number` when applicable

### Code Style

- **Language:** All code, comments, and documentation must be in **English**
- **TypeScript:** Strict mode (`strict: true`) enforced
- **Formatting:** Use the project's built-in formatter (Deno: `deno fmt`; Frontend: configured in `tsconfig.json`)
- **Naming:**
  - Files: `kebab-case.ts` (e.g., `api_spec.ts` for type-only modules, `generate.ts` for handlers)
  - Functions/Variables: `camelCase`
  - Types/Interfaces: `PascalCase`
  - Constants: `UPPER_SNAKE_CASE`
- **Comments:** Write comments in English. Explain **why**, not **what**. Avoid decorative comment blocks.
- **Imports:** Group and order imports: standard library → third-party → local modules

### Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Tests pass (`deno test` in both `backend/` and `genai/`)
- [ ] No Chinese text in code or comments
- [ ] Commits follow conventional commit format
- [ ] The PR description clearly explains **what** changed and **why**
- [ ] Breaking changes are explicitly noted
- [ ] Documentation is updated if needed

### Pull Request Review Process

1. A maintainer will review your PR
2. CI checks must pass before merge
3. Address review feedback — this is a collaborative process
4. Once approved, a maintainer will merge your PR

## Testing

```bash
# Run backend tests
cd backend
deno test --allow-net --allow-read --allow-env

# Run genai tests
cd genai
deno test --allow-net --allow-read --allow-env

# Run a specific test file
deno test --allow-net --allow-read --allow-env tests/integration_test.ts
```

## Questions?

Feel free to ask questions in:

- [GitHub Issues](https://github.com/phaethix/api-doc-generator/issues) — for technical questions or problems
- [GitHub Discussions](https://github.com/phaethix/api-doc-generator/discussions) — for general discussion

---

Thank you for contributing! 🚀
