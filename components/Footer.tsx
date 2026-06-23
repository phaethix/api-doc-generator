export default function Footer() {
  return (
    <footer class="border-t border-slate-200 bg-white">
      <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div class="flex items-center gap-3 text-sm text-slate-500">
            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-3.5 w-3.5 text-white"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <span>
              © {new Date().getFullYear()} API Doc Generator · Built with Deno &
              Fresh
            </span>
          </div>
          <div class="flex items-center gap-5 text-sm">
            <a
              href="/docs"
              class="text-slate-500 transition-colors hover:text-brand-600"
            >
              文档
            </a>
            <a
              href="/api/health"
              class="text-slate-500 transition-colors hover:text-brand-600"
            >
              API Health
            </a>
            <a
              href="https://fresh.deno.dev"
              target="_blank"
              rel="noopener noreferrer"
              class="text-slate-500 transition-colors hover:text-brand-600"
            >
              Powered by Fresh
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
