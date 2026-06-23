import { useState } from "preact/hooks";

export type ResultFormat = "markdown" | "html" | "json";

interface ResultPanelProps {
  result: { content: string; format: ResultFormat } | null;
  format: ResultFormat;
  isLoading: boolean;
}

export default function ResultPanel({ result, format, isLoading }: ResultPanelProps) {
  const [viewMode, setViewMode] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const content = result.content;
    const ext = result.format === "html" ? "html" : result.format === "json" ? "json" : "md";
    const mimeType =
      result.format === "html"
        ? "text/html"
        : result.format === "json"
        ? "application/json"
        : "text/markdown";

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-docs.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div class="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
      {/* Result Header */}
      <div class="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <div class="flex items-center gap-2">
          <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="h-3.5 w-3.5 text-emerald-600"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-900">生成结果</span>
        </div>

        {/* View Mode Toggle */}
        {result && (
          <div class="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              class={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "preview"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              预览
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              class={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                viewMode === "raw"
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              原始
            </button>
          </div>
        )}
      </div>

      {/* Result Content */}
      <div class="flex-1 p-5">
        {!result && !isLoading && (
          <div class="flex h-96 flex-col items-center justify-center text-center">
            <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-10 w-10 text-slate-400"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
                <line x1="9" y1="11" x2="13" y2="11" />
              </svg>
            </div>
            <h3 class="mt-4 text-base font-semibold text-slate-700">
              等待生成
            </h3>
            <p class="mt-1 max-w-xs text-sm text-slate-500">
              在左侧输入 API 规范并点击「生成文档」按钮，结果将显示在这里
            </p>
          </div>
        )}

        {isLoading && (
          <div class="flex h-96 flex-col items-center justify-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/30">
              <svg
                class="h-8 w-8 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <p class="mt-4 text-sm font-medium text-slate-600">
              正在解析并生成文档...
            </p>
            <div class="mt-3 h-1 w-48 overflow-hidden rounded-full bg-slate-200">
              <div class="h-full w-1/3 animate-pulse-slow rounded-full bg-gradient-to-r from-brand-500 to-brand-700" />
            </div>
          </div>
        )}

        {result && !isLoading && (
          <div class="animate-slide-up">
            {viewMode === "preview" && format === "html" ? (
              <iframe
                srcDoc={result.content}
                class="h-96 w-full rounded-xl border border-slate-200 bg-white"
                sandbox="allow-same-origin"
              />
            ) : viewMode === "preview" && format === "json" ? (
              <pre class="h-96 overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-4 text-left font-mono text-xs leading-relaxed text-slate-300">
                <code>{formatJson(result.content)}</code>
              </pre>
            ) : viewMode === "preview" ? (
              <div class="h-96 overflow-auto rounded-xl border border-slate-200 bg-white p-5">
                <MarkdownPreview content={result.content} />
              </div>
            ) : (
              <pre class="h-96 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed text-slate-800">
                <code>{result.content}</code>
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Result Footer */}
      {result && !isLoading && (
        <div class="border-t border-slate-200 px-5 py-3.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3 text-xs text-slate-500">
              <span class="inline-flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                生成成功
              </span>
              <span>·</span>
              <span>{result.content.length.toLocaleString()} 字符</span>
              <span>·</span>
              <span class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] uppercase">
                {result.format}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                {copied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5 text-emerald-600">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span class="text-emerald-600">已复制</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    复制
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                class="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/30 transition-all hover:shadow-lg hover:shadow-brand-500/40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatJson(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

function MarkdownPreview({ content }: { content: string }) {
  const html = renderSimpleMarkdown(content);
  return (
    <div
      class="prose prose-slate prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSimpleMarkdown(md: string): string {
  let html = escapeHtml(md);

  // Code blocks (multi-line, with optional language)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    return `<pre class="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto my-3 text-xs"><code>${code.trim()}</code></pre>`;
  });

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2 text-slate-900">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-5 mb-2 text-slate-900 border-b border-slate-200 pb-1">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-slate-900">$1</h1>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-4 border-slate-200" />');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');

  // Tables
  html = html.replace(
    /(\|.+\|\n\|[-| :]+\|\n(?:\|.+\|\n?)+)/g,
    (_m, table) => {
      const lines = table.trim().split("\n");
      const headerCells = lines[0].split("|").filter((c: string) => c.trim()).map((c: string) => c.trim());
      const rows = lines.slice(2).map((line: string) =>
        line.split("|").filter((c: string) => c.trim()).map((c: string) => c.trim())
      );
      let tableHtml =
        '<div class="overflow-x-auto my-3"><table class="w-full border-collapse text-sm"><thead><tr>';
      headerCells.forEach((cell: string) => {
        tableHtml += `<th class="bg-slate-100 text-left px-3 py-2 border border-slate-200 font-semibold text-slate-700">${cell}</th>`;
      });
      tableHtml += "</tr></thead><tbody>";
      rows.forEach((row: string[]) => {
        tableHtml += "<tr>";
        row.forEach((cell: string) => {
          tableHtml += `<td class="px-3 py-2 border border-slate-200 text-slate-700">${cell}</td>`;
        });
        tableHtml += "</tr>";
      });
      tableHtml += "</tbody></table></div>";
      return tableHtml;
    },
  );

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="border-l-4 border-brand-300 bg-brand-50 pl-4 py-2 my-2 text-slate-700 italic">$1</blockquote>');

  // Paragraphs (lines not starting with formatting tags or empty)
  html = html.replace(/^(?!<[h|p|d|u|o|l|t|s|b|q])(.+)$/gm, '<p class="my-2 text-slate-700 leading-relaxed">$1</p>');

  // Clean up empty paragraphs
  html = html.replace(/<p[^>]*>\s*<\/p>/g, "");
  // Clean up consecutive <br> from line breaks in regular text
  html = html.replace(/(<\/p>)\s*<p[^>]*>/g, "$1");

  return html;
}
