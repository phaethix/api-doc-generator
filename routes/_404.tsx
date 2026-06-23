import { Head } from "$fresh/runtime.ts";

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 - 页面未找到 | API Doc Generator</title>
      </Head>
      <div class="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div class="relative">
          <div class="text-[120px] font-extrabold leading-none tracking-tight text-slate-200 sm:text-[180px]">
            404
          </div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="rounded-2xl bg-white/90 px-6 py-3 text-center shadow-xl backdrop-blur-sm">
              <h1 class="text-xl font-bold text-slate-900">页面未找到</h1>
              <p class="mt-1 text-sm text-slate-500">
                你访问的页面可能已被移动或删除
              </p>
            </div>
          </div>
        </div>
        <a
          href="/"
          class="mt-12 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-0.5"
        >
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
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          返回首页
        </a>
      </div>
    </>
  );
}
