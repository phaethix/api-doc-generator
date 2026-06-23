import { Head } from "$fresh/runtime.ts";

export default function Docs() {
  return (
    <>
      <Head>
        <title>API 文档 | API Doc Generator</title>
      </Head>
      <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-slate-900 sm:text-4xl">API 文档</h1>
        <p class="mt-4 text-lg text-slate-600">
          API Doc Generator 提供两个主要端点用于生成 API 文档。
        </p>

        <div class="mt-12 space-y-8">
          {/* Health Endpoint */}
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                GET
              </span>
              <code class="font-mono text-sm font-semibold text-slate-900">
                /api/health
              </code>
            </div>
            <p class="mt-3 text-sm text-slate-600">
              健康检查端点，返回服务的运行状态。
            </p>
            <div class="mt-4 rounded-lg bg-slate-900 p-4">
              <pre class="text-xs text-slate-300">
                <code>{`{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}`}</code>
              </pre>
            </div>
          </div>

          {/* Generate Endpoint */}
          <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-blue-700">
                POST
              </span>
              <code class="font-mono text-sm font-semibold text-slate-900">
                /api/generate
              </code>
            </div>
            <p class="mt-3 text-sm text-slate-600">
              生成 API 文档。接收 OpenAPI 规范 JSON，返回指定格式的文档。
            </p>

            <h3 class="mt-5 text-sm font-semibold text-slate-900">查询参数</h3>
            <table class="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr class="border-b border-slate-200">
                  <th class="py-2 text-left font-semibold text-slate-700">参数</th>
                  <th class="py-2 text-left font-semibold text-slate-700">说明</th>
                  <th class="py-2 text-left font-semibold text-slate-700">默认值</th>
                </tr>
              </thead>
              <tbody>
                <tr class="border-b border-slate-100">
                  <td class="py-2 font-mono text-xs text-slate-700">format</td>
                  <td class="py-2 text-slate-600">输出格式: markdown, html, json</td>
                  <td class="py-2 font-mono text-xs text-slate-500">markdown</td>
                </tr>
              </tbody>
            </table>

            <h3 class="mt-5 text-sm font-semibold text-slate-900">请求体示例</h3>
            <div class="mt-2 rounded-lg bg-slate-900 p-4">
              <pre class="text-xs text-slate-300">
                <code>{`{
  "info": {
    "title": "My API",
    "version": "1.0.0"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "List users",
        "responses": {
          "200": { "description": "OK" }
        }
      }
    }
  }
}`}</code>
              </pre>
            </div>

            <h3 class="mt-5 text-sm font-semibold text-slate-900">响应格式</h3>
            <p class="mt-2 text-sm text-slate-600">
              根据 <code class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">format</code> 参数返回对应的 Content-Type:
            </p>
            <ul class="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
              <li><code class="font-mono text-xs">markdown</code> → <code class="font-mono text-xs">text/markdown</code></li>
              <li><code class="font-mono text-xs">html</code> → <code class="font-mono text-xs">text/html</code></li>
              <li><code class="font-mono text-xs">json</code> → <code class="font-mono text-xs">application/json</code></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
