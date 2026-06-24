# 贡献指南 — API 文档生成器

感谢你的贡献意愿！本文档说明了参与本项目的流程和规范。

> 🌐 [English Version](../CONTRIBUTING.md)

## 行为准则

本项目遵循以下简单原则：

- 所有互动中保持尊重和包容
- 专注于建设性反馈
- 对其他贡献者保持善意推定

## 快速上手

### 前置条件

- [Deno 2.x](https://deno.land)
- [Node.js 18+](https://nodejs.org)
- （可选）Docker

### 开发环境搭建

```bash
# 1. 克隆仓库
git clone https://github.com/phaethix/api-doc-generator.git
cd api-doc-generator

# 2. 配置环境变量
cp config/env.example .env
# 编辑 .env 文件，设置 OPENAI_API_KEY（如果要开发 AI 功能）

# 3. 构建前端
cd frontend && npm install && npm run build && cd ..

# 4. 启动后端开发服务器
cd backend && deno task start
```

也可以使用一键启动脚本：

```bash
./scripts/dev.sh start    # 启动前后端
./scripts/dev.sh status   # 查看状态
./scripts/dev.sh stop     # 停止服务
```

### 项目结构

```
.
├── backend/          # Deno HTTP 服务端
│   ├── core/         # 核心流水线（parser、generator、renderer）
│   ├── handlers/     # HTTP 请求处理器
│   ├── adapters/     # OpenAPI 适配器
│   ├── middleware/    # 中间件（logger 等）
│   ├── types/        # 共享 TypeScript 类型定义
│   └── tests/        # 单元测试与集成测试
├── frontend/         # React SPA（Vite + Tailwind CSS）
│   └── src/
│       ├── components/  # React 组件
│       ├── api/         # API 客户端
│       └── utils/       # 工具函数
├── genai/            # AI 生成模块
│   ├── providers/    # LLM provider 实现
│   ├── schemas/      # JSON Schema 定义
│   └── tests/        # GenAI 测试
├── scripts/          # 开发脚本
├── docs/             # 文档
└── config/           # 配置文件
```

## 贡献方式

### 报告 Bug

1. 先搜索[已有 issue](https://github.com/phaethix/api-doc-generator/issues)，避免重复
2. 使用 **Bug Report** 模板提交
3. 请包含以下信息：
   - Deno 版本（`deno --version`）
   - Node.js 版本（`node --version`）
   - 复现步骤
   - 预期行为 vs 实际行为
   - 相关错误信息或日志

### 建议新功能

1. 先搜索[已有 issue](https://github.com/phaethix/api-doc-generator/issues)
2. 使用 **Feature Request** 模板提交
3. 描述你要解决的问题以及为什么重要
4. 查看 [Roadmap](../ROADMAP.md) 确认是否已在规划中

### 认领任务

关注以下标签的 issue：

- [`good-first-issue`](https://github.com/phaethix/api-doc-generator/labels/good-first-issue) — 适合新贡献者
- [`help-wanted`](https://github.com/phaethix/api-doc-generator/labels/help-wanted) — 开放给社区
- [`enhancement`](https://github.com/phaethix/api-doc-generator/labels/enhancement) — 新功能

**开始工作前请先在 issue 下留言**，让其他人知道你在处理这个任务。

### 开发流程

1. **Fork** 本仓库
2. **创建分支**（从 `main` 分支检出）：

   ```bash
   git checkout -b feat/my-feature
   # 或：fix/my-bugfix, docs/my-docs-update, refactor/my-refactor
   ```

   分支命名规范：
   - `feat/` — 新功能
   - `fix/` — Bug 修复
   - `docs/` — 文档变更
   - `refactor/` — 代码重构
   - `test/` — 测试相关
   - `chore/` — 维护任务

3. **编写代码**，遵循下方代码风格规范
4. **运行测试**，确保没有破坏现有功能：

   ```bash
   # 后端测试
   cd backend && deno test --allow-net --allow-read --allow-env

   # GenAI 测试
   cd genai && deno test --allow-net --allow-read --allow-env
   ```

5. **提交**代码（遵循下方提交规范）
6. **推送**分支并发起 Pull Request
7. 确保 CI 检查全部通过

### 提交规范

本项目采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[可选的详细描述]
```

**Type 类型：** `feat`（功能）、`fix`（修复）、`docs`（文档）、`style`（格式）、`refactor`（重构）、`test`（测试）、`chore`（杂项）

**示例：**

```
feat(genai): add streaming support for OpenAI provider
fix(frontend): correct dark mode toggle state persistence
docs(readme): update API usage examples
refactor(backend): extract response helpers to shared module
test(backend): add integration tests for /import/openapi
```

**规则：**

- 提交信息必须使用**英文**
- 描述使用祈使语气（"add" 而非 "added"）
- 首行不超过 72 个字符
- 涉及 issue 时使用 `#issue-number` 引用

### 代码风格

- **语言：** 所有代码、注释、文档必须使用**英文**
- **TypeScript：** 严格模式（`strict: true`）
- **格式化：** 使用项目自带的格式化工具（Deno: `deno fmt`；前端：配置在 `tsconfig.json` 中）
- **命名规范：**
  - 文件：`kebab-case.ts`（类型定义模块如 `api_spec.ts`，handler 如 `generate.ts`）
  - 函数/变量：`camelCase`
  - 类型/接口：`PascalCase`
  - 常量：`UPPER_SNAKE_CASE`
- **注释：** 注释用英文写。解释**为什么**这么做，而非重复代码做了什么。避免装饰性注释块。
- **Import 顺序：** 标准库 → 第三方 → 本地模块

### Pull Request 检查清单

提交 PR 前，请确认：

- [ ] 测试通过（在 `backend/` 和 `genai/` 目录下分别运行 `deno test`）
- [ ] 代码和注释中没有中文
- [ ] 提交信息遵循 Conventional Commits 格式
- [ ] PR 描述清楚地说明了**改了什么**和**为什么改**
- [ ] 破坏性变更已明确标注
- [ ] 相关文档已更新

### PR 审核流程

1. 维护者会审核你的 PR
2. CI 检查必须全部通过才能合并
3. 认真对待审核意见——这是协作过程
4. 审核通过后，维护者会合并你的 PR

## 测试

```bash
# 运行后端测试
cd backend
deno test --allow-net --allow-read --allow-env

# 运行 genai 测试
cd genai
deno test --allow-net --allow-read --allow-env

# 运行单个测试文件
deno test --allow-net --allow-read --allow-env tests/integration_test.ts
```

## 有问题？

欢迎通过以下渠道提问：

- [GitHub Issues](https://github.com/phaethix/api-doc-generator/issues) — 技术问题或 bug
- [GitHub Discussions](https://github.com/phaethix/api-doc-generator/discussions) — 一般性讨论

---

感谢你的贡献！🚀
