# API Doc Generator

将 OpenAPI/Swagger 规范转化为精美文档的在线工具。

## 功能特性

- 粘贴或上传 OpenAPI/Swagger JSON 规范
- 即时生成 Markdown、HTML 或 JSON 格式的 API 文档
- 支持参数、请求体、响应等完整文档结构
- 自动按标签分组
- 简洁美观的 UI 交互

## 技术栈

- **前端**: React + Vite + Tailwind CSS
- **后端**: Express + TypeScript
- **前后端一体**: 开发模式下 Vite proxy 连接后端，生产模式下 Express 同时提供 API 和静态文件

## 开发

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
健康检查，返回 `{ status: "ok", timestamp: "..." }`

### `POST /api/generate?format=markdown|html|json`
生成 API 文档。请求体为 OpenAPI/Swagger JSON 规范。

- `format=markdown` → 返回 Markdown 文档
- `format=html` → 返回 HTML 文档
- `format=json` → 返回 JSON 格式的 DocNode

## 项目结构

```
src/
  client/          # React 前端应用
    src/
      App.tsx           # 主应用组件
      components/
        GeneratorForm.tsx  # 输入面板
        ResultPanel.tsx    # 结果面板
  server/          # Express 后端
    index.ts           # 服务器入口
    handlers/          # API 路由处理器
    core/              # 核心业务逻辑
      parser.ts         # 类型守卫与解析
      generator.ts      # ApiSpec → DocNode 转换
      renderer.ts       # DocNode → md/html/json 渲染
    adapters/          # 适配器
      openapi.ts        # OpenAPI 3.x → ApiSpec
    types/             # TypeScript 类型定义
```
