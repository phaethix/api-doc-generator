import { useState, useRef } from "preact/hooks";
import ResultPanel, { type ResultFormat } from "./ResultPanel.tsx";

type InputMode = "paste" | "upload";

const DEFAULT_SPEC = `{
  "info": {
    "title": "My API",
    "version": "1.0.0",
    "description": "A beautiful API"
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "Get all users",
        "tags": ["users"],
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": { "type": "integer" }
          }
        ],
        "responses": {
          "200": { "description": "Success" }
        }
      }
    }
  }
}`;

export default function GeneratorForm() {
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [specText, setSpecText] = useState<string>(DEFAULT_SPEC);
  const [format, setFormat] = useState<ResultFormat>("markdown");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ content: string; format: ResultFormat } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("文件大小不能超过 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        JSON.parse(text);
        setSpecText(text);
        setInputMode("paste");
      } catch (err) {
        setError(`文件解析失败: ${err instanceof Error ? err.message : "无效的 JSON"}`);
      }
    };
    reader.onerror = () => setError("读取文件失败");
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!specText.trim()) {
      setError("请输入 API 规范内容");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      JSON.parse(specText);

      const res = await fetch(`/api/generate?format=${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: specText,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `生成失败 (${res.status})`);
      }

      const content = await res.text();
      setResult({ content, format });
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError(`JSON 格式错误: ${err.message}`);
      } else {
        setError(err instanceof Error ? err.message : "生成失败");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setSpecText("");
    setResult(null);
    setError(null);
  };

  const handleLoadExample = () => {
    setSpecText(DEFAULT_SPEC);
    setError(null);
  };

  const handleFormatChange = (newFormat: ResultFormat) => {
    setFormat(newFormat);
    if (result && specText.trim()) {
      // Re-generate with new format
      setTimeout(() => {
        handleGenerate();
      }, 0);
    }
  };

  return (
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left Panel - Input */}
      <div class="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
        {/* Input Header */}
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div class="flex items-center gap-2">
            <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-3.5 w-3.5 text-brand-600"
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <span class="text-sm font-semibold text-slate-900">API 规范输入</span>
          </div>

          {/* Format Selector */}
          <div class="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1">
            {(["markdown", "html", "json"] as ResultFormat[]).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => handleFormatChange(fmt)}
                class={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-all ${
                  format === fmt
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Input Mode Tabs */}
        <div class="flex gap-1 border-b border-slate-200 bg-slate-50/50 px-5 py-2">
          <button
            type="button"
            onClick={() => setInputMode("paste")}
            class={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              inputMode === "paste"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            粘贴 JSON
          </button>
          <button
            type="button"
            onClick={() => setInputMode("upload")}
            class={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              inputMode === "upload"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            上传文件
          </button>

          <div class="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadExample}
              class="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
            >
              加载示例
            </button>
            <button
              type="button"
              onClick={handleClear}
              class="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
            >
              清空
            </button>
          </div>
        </div>

        {/* Input Content */}
        <div class="flex-1 p-5">
          {inputMode === "paste" ? (
            <textarea
              value={specText}
              onInput={(e) => setSpecText((e.target as HTMLTextAreaElement).value)}
              placeholder="在此粘贴你的 OpenAPI 规范 JSON..."
              spellCheck={false}
              class="h-96 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-sm leading-relaxed text-slate-800 placeholder-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement).classList.add("border-brand-400", "bg-brand-50");
              }}
              onDragLeave={(e) => {
                (e.currentTarget as HTMLElement).classList.remove("border-brand-400", "bg-brand-50");
              }}
              onDrop={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLElement).classList.remove("border-brand-400", "bg-brand-50");
                const file = e.dataTransfer?.files[0];
                if (file) handleFileUpload(file);
              }}
              class="flex h-96 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50"
            >
              <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-8 w-8 text-white"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3 class="mt-4 text-base font-semibold text-slate-900">
                拖放文件到此处
              </h3>
              <p class="mt-1 text-sm text-slate-500">
                或点击下方的按钮选择文件
              </p>
              <p class="mt-2 text-xs text-slate-400">
                支持 .json 格式 · 最大 5MB
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                class="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-brand-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition-all hover:border-brand-300 hover:bg-brand-50"
              >
                选择文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFileUpload(file);
                }}
                class="hidden"
              />
              {specText && inputMode === "upload" && (
                <div class="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  文件已加载 ({(specText.length / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div class="border-t border-slate-200 px-5 py-4">
          {error && (
            <div class="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 animate-fade-in">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 h-4 w-4 flex-shrink-0">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            class="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:transform-none disabled:shadow-lg"
          >
            {isLoading ? (
              <>
                <svg
                  class="h-4 w-4 animate-spin"
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
                正在生成文档...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="h-4 w-4 transition-transform group-hover:scale-110"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                  <line x1="9" y1="11" x2="13" y2="11" />
                </svg>
                生成文档
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Panel - Result */}
      <ResultPanel result={result} format={format} isLoading={isLoading} />
    </div>
  );
}
