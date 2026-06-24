import { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { JsonEditor } from "./components/JsonEditor";
import { OutputPanel } from "./components/OutputPanel";
import { FormatSelector } from "./components/FormatSelector";
import { ToastContainer, showToast } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import type { OutputFormat } from "./types";
import { generateDoc, importOpenAPI, generateOpenAPI } from "./api/client";
import { sampleApiSpec, sampleOpenAPI } from "./utils/sample";

type InputMode = "spec" | "openapi" | "ai";

export default function App() {
  const [inputMode, setInputMode] = useState<InputMode>("spec");
  const [inputValue, setInputValue] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("markdown");
  const [outputContent, setOutputContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // 同步主题到 document.documentElement
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // 全局错误捕获
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global error caught:", event.error || event.message);
      console.error("Error details:", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  const handleGenerate = useCallback(async () => {
    if (inputMode === "ai") {
      // AI 生成模式
      if (!inputValue.trim()) {
        setInputError("请输入接口描述");
        showToast("error", "请输入接口描述");
        return;
      }

      setInputError(null);
      setError(null);
      setIsLoading(true);

      try {
        const result = await generateOpenAPI(inputValue.trim(), "endpoint");
        const openapiJson = JSON.stringify(result.openapi, null, 2);
        setOutputContent(openapiJson);
        showToast("success", `AI 生成成功！使用格式：${result.format_used}`);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "AI 生成失败";
        setError(errMsg);
        showToast("error", errMsg);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!inputValue.trim()) {
      setInputError("请输入 API 规范");
      showToast("error", "请输入 API 规范");
      return;
    }

    setInputError(null);
    setError(null);
    setIsLoading(true);

    try {
      let parseResult;
      try {
        parseResult = JSON.parse(inputValue);
      } catch {
        setInputError("JSON 格式无效，请检查输入");
        showToast("error", "JSON 格式无效");
        setIsLoading(false);
        return;
      }

      const { content } = inputMode === "openapi"
        ? await importOpenAPI(parseResult, outputFormat)
        : await generateDoc(parseResult, outputFormat);

      setOutputContent(content);
      showToast("success", "文档生成成功！");
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "生成失败";
      setError(errMsg);
      showToast("error", errMsg);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, inputMode, outputFormat]);

  const handleCopy = useCallback(async () => {
    if (!outputContent) return;
    try {
      await navigator.clipboard.writeText(outputContent);
      showToast("success", "已复制到剪贴板");
    } catch {
      showToast("error", "复制失败");
    }
  }, [outputContent]);

  const handleDownload = useCallback(() => {
    if (!outputContent) return;
    const extension = outputFormat === "html" ? "html" : outputFormat === "json" ? "json" : "md";
    const mimeType = outputFormat === "html"
      ? "text/html"
      : outputFormat === "json"
      ? "application/json"
      : "text/markdown";

    const blob = new Blob([outputContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-docs.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("success", "文件已下载");
  }, [outputContent, outputFormat]);

  const handleLoadSample = useCallback(() => {
    setInputValue(inputMode === "openapi" ? sampleOpenAPI : sampleApiSpec);
    setOutputContent("");
    setError(null);
    setInputError(null);
    showToast("info", "已加载示例数据");
  }, [inputMode]);

  const handleClear = useCallback(() => {
    setInputValue("");
    setOutputContent("");
    setError(null);
    setInputError(null);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  }, []);

  return (
    <ErrorBoundary>
    <div className="min-h-screen flex flex-col">
      <Header
        onLoadSample={handleLoadSample}
        onClear={handleClear}
        onToggleTheme={handleToggleTheme}
        theme={theme}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Input Mode Tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setInputMode("spec")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              inputMode === "spec"
                ? "bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            自定义 API 规范
          </button>
          <button
            type="button"
            onClick={() => setInputMode("openapi")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              inputMode === "openapi"
                ? "bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            OpenAPI 导入
          </button>
          <button
            type="button"
            onClick={() => setInputMode("ai")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
              inputMode === "ai"
                ? "bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI 生成
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-220px)]">
          {/* Left Panel - Input */}
          <div className="card flex flex-col p-4 h-full">
            {inputMode === "ai" ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    AI 生成接口
                  </h2>
                  <span className="text-xs text-purple-500 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                    自然语言描述
                  </span>
                </div>

                <div className="flex-1">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={"用自然语言描述你想要生成的 API 接口，例如：\n用户登录接口，接收手机号和验证码，返回 JWT token\n\n或者更详细的描述：\n一个待办事项服务，支持创建、查询、更新、删除待办事项"}
                    className="w-full h-[400px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                  {inputError && (
                    <p className="mt-2 text-sm text-red-500">{inputError}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    {inputMode === "spec" ? "API 规范输入" : "OpenAPI 规范导入"}
                  </h2>
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                    JSON 格式
                  </span>
                </div>

                <div className="flex-1">
                  <JsonEditor
                    value={inputValue}
                    onChange={setInputValue}
                    label=""
                    error={inputError}
                    placeholder={
                      inputMode === "spec"
                        ? '例如：{\n  "info": { "title": "My API", "version": "1.0" },\n  "paths": {...}\n}'
                        : '粘贴 OpenAPI 3.0 规范，例如：\n{\n  "openapi": "3.0.0",\n  "info": {...},\n  "paths": {...}\n}'
                    }
                    height="400px"
                  />
                </div>
              </>
            )}

            <div className="mt-4 space-y-3">
              {inputMode === "ai" ? (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading || !inputValue.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-3 text-base font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      AI 生成中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      AI 生成接口
                    </>
                  )}
                </button>
              ) : (
                <FormatSelector value={outputFormat} onChange={setOutputFormat} />
              )}

              {inputMode !== "ai" && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-full btn-primary py-3 text-base font-semibold"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      生成中...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      生成文档
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Panel - Output */}
          <div className="card flex flex-col p-4 h-full">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">
              {inputMode === "ai" ? "AI 生成的 OpenAPI 规范" : "输出结果"}
            </h2>
            <div className="flex-1 min-h-[400px]">
              <OutputPanel
                content={outputContent}
                format={inputMode === "ai" ? "json" : outputFormat}
                loading={isLoading && !outputContent}
                error={error}
                onCopy={handleCopy}
                onDownload={handleDownload}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            API 文档生成器 · 基于 Deno + React 构建 · 数据完全在本地处理，不会上传到任何服务器
          </p>
        </footer>
      </main>

      <ToastContainer />
    </div>
    </ErrorBoundary>
  );
}
