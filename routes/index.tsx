import { Head } from "$fresh/runtime.ts";
import GeneratorForm from "../islands/GeneratorForm.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>API Doc Generator — 一键生成精美 API 文档</title>
      </Head>

      {/* Hero Section */}
      <section class="relative overflow-hidden">
        <div class="pointer-events-none absolute inset-0">
          <div class="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-400/20 to-purple-400/20 blur-3xl" />
          <div class="absolute top-60 right-0 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-cyan-400/15 to-blue-400/15 blur-3xl" />
        </div>

        <div class="relative mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 lg:px-8 lg:pt-32">
          <div class="mx-auto max-w-4xl text-center animate-fade-in">
            <div class="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
              <span class="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
              基于 OpenAPI / JSON 规范
            </div>

            <h1 class="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              将 API 规范转换为
              <span class="block bg-gradient-to-r from-brand-600 via-brand-500 to-cyan-500 bg-clip-text text-transparent">
                精美的文档
              </span>
            </h1>

            <p class="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              粘贴你的 OpenAPI JSON 规范，或上传规范文件，几秒钟内即可生成
              Markdown、HTML 或 JSON 格式的 API 文档。
            </p>

            <div class="mt-10 flex items-center justify-center gap-3">
              <a
                href="#generator"
                class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-0.5"
              >
                开始生成
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-4 w-4"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </a>
              <a
                href="#example"
                class="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                查看示例
              </a>
            </div>
          </div>

          {/* Feature highlights */}
          <div class="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                icon: (
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                ),
                title: "多格式输出",
                desc: "支持 Markdown、HTML、JSON 三种格式，满足不同场景需求",
              },
              {
                icon: (
                  <>
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                  </>
                ),
                title: "OpenAPI 兼容",
                desc: "完全兼容 OpenAPI 3.x 规范，自动解析路径、参数、响应",
              },
              {
                icon: (
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                ),
                title: "极速生成",
                desc: "基于 Deno 的高性能运行时，毫秒级文档生成",
              },
            ].map((feature, i) => (
              <div
                key={i}
                class="group relative rounded-2xl border border-slate-200 bg-white/60 p-6 backdrop-blur-sm transition-all hover:border-brand-200 hover:bg-white hover:shadow-xl hover:shadow-brand-500/5"
              >
                <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/30 transition-transform group-hover:scale-110">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    class="h-5 w-5 text-white"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3 class="mt-4 text-base font-semibold text-slate-900">
                  {feature.title}
                </h3>
                <p class="mt-1.5 text-sm leading-6 text-slate-600">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Generator Section */}
      <section id="generator" class="relative py-16 sm:py-24">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <GeneratorForm />
        </div>
      </section>

      {/* Example Section */}
      <section id="example" class="relative bg-slate-50 py-16 sm:py-24">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-2xl text-center">
            <h2 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              输入示例
            </h2>
            <p class="mt-4 text-lg text-slate-600">
              下面是一个标准的 OpenAPI 规范格式，你可以直接复制使用
            </p>
          </div>
          <div class="mx-auto mt-10 max-w-4xl">
            <pre class="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-900 p-6 text-sm leading-relaxed text-slate-300 shadow-xl">
              <code>{`{
  "info": {
    "title": "Pet Store API",
    "version": "1.0.0",
    "description": "A simple pet store API"
  },
  "paths": {
    "/pets": {
      "get": {
        "summary": "List all pets",
        "tags": ["pets"],
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "required": true,
            "schema": { "type": "integer" }
          }
        ],
        "responses": {
          "200": { "description": "A list of pets" },
          "400": { "description": "Invalid parameters" }
        }
      },
      "post": {
        "summary": "Create a pet",
        "tags": ["pets"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "type": "object" }
            }
          }
        },
        "responses": {
          "201": { "description": "Created" }
        }
      }
    }
  }
}`}</code>
            </pre>
          </div>
        </div>
      </section>
    </>
  );
}
