import React from "react";

type OutputFormat = "markdown" | "html" | "json";
type InputMode = "paste" | "upload";

interface Props {
  input: string;
  setInput: (v: string) => void;
  inputMode: InputMode;
  setInputMode: (v: InputMode) => void;
  format: OutputFormat;
  onFormatChange: (v: OutputFormat) => void;
  isLoading: boolean;
  error: string | null;
  onGenerate: () => void;
  onClear: () => void;
  onLoadSample: () => void;
  onFileUpload: (file: File) => void;
}

export default function GeneratorForm({
  input,
  setInput,
  inputMode,
  setInputMode,
  format,
  onFormatChange,
  isLoading,
  error,
  onGenerate,
  onClear,
  onLoadSample,
  onFileUpload,
}: Props) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add("border-brand-400", "bg-brand-50");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("border-brand-400", "bg-brand-50");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("border-brand-400", "bg-brand-50");
    const file = e.dataTransfer?.files[0];
    if (file) onFileUpload(file);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-brand-600">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-900">API 规范输入</span>
        </div>

        {/* Format selector */}
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1">
          {(["markdown", "html", "json"] as OutputFormat[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFormatChange(f)}
              className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-all ${
                format === f
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Input mode tabs */}
      <div className="flex gap-1 border-b border-slate-200 bg-slate-50/50 px-5 py-2">
        <button
          type="button"
          onClick={() => setInputMode("paste")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
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
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            inputMode === "upload"
              ? "bg-white text-brand-700 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          上传文件
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onLoadSample}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
          >
            加载示例
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200/70 hover:text-slate-700"
          >
            清空
          </button>
        </div>
      </div>

      {/* Input area */}
      <div className="flex-1 p-5">
        {inputMode === "paste" ? (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="在此粘贴你的 OpenAPI 规范 JSON..."
            spellCheck={false}
            className="h-96 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-sm leading-relaxed text-slate-800 placeholder-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          />
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="flex h-96 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-8 text-center transition-colors hover:border-brand-400 hover:bg-brand-50/50"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-white">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">拖拽文件到此处</h3>
            <p className="mt-1 text-sm text-slate-500">或点击下方的按钮选择文件</p>
            <p className="mt-2 text-xs text-slate-400">支持 .json 格式 · 最大 5MB</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-brand-200 bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 transition-all hover:border-brand-300 hover:bg-brand-50"
            >
              选择文件
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileUpload(file);
              }}
              className="hidden"
            />
            {input && inputMode === "upload" && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                文件已加载 ({(input.length / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer: error + generate button */}
      <div className="border-t border-slate-200 px-5 py-4">
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 flex-shrink-0">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        <button
          type="button"
          onClick={onGenerate}
          disabled={isLoading}
          className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl hover:shadow-brand-500/40 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 disabled:transform-none disabled:shadow-lg"
        >
          {isLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              正在生成文档...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform group-hover:scale-110">
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
  );
}
