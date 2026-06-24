import { useState, useEffect, useCallback, useRef } from "react";
import { Header } from "./components/Header";
import { JsonEditor } from "./components/JsonEditor";
import { OutputPanel } from "./components/OutputPanel";
import { FormatSelector } from "./components/FormatSelector";
import { ToastContainer, showToast } from "./components/Toast";
import { ErrorBoundary } from "./components/ErrorBoundary";
import type { OutputFormat } from "./types";
import { generateDoc, importOpenAPI, generateOpenAPIStream } from "./api/client";
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

  // Streaming UX state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [streamingProgress, setStreamingProgress] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startTimer = () => {
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelGeneration = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopTimer();
    setIsLoading(false);
    showToast("info", "Generation cancelled");
  };

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
      // AI generation mode - using streaming API
      if (!inputValue.trim()) {
        setInputError("Please enter API description");
        showToast("error", "Please enter API description");
        return;
      }

      setInputError(null);
      setError(null);
      setIsLoading(true);
      setOutputContent(""); // 清空之前的输出
      setElapsedSeconds(0);
      setCharCount(0);
      setStreamingProgress("Connecting to AI service...");

      // 创建 AbortController 用于取消
      const abortController = new AbortController();
      abortRef.current = abortController;

      startTimer();

      try {
        let finalResult: { openapi: unknown; format_used: string } | null = null;
        let streamError: Error | null = null;
        
        await generateOpenAPIStream(
          inputValue.trim(),
          "endpoint",
          (event: { type: string; [key: string]: unknown }) => {
            if (event.type === "delta") {
              // 实时更新输出内容
              const content = event.content as string;
              setOutputContent((prev) => prev + content);
              setCharCount((prev) => prev + (content?.length ?? 0));
              setStreamingProgress("Generating OpenAPI specification...");
            } else if (event.type === "done") {
              // 接收完整结果
              const result = event.result as {
                openapi: unknown;
                format_used: string;
              };
              finalResult = {
                openapi: result.openapi,
                format_used: result.format_used,
              };
              setStreamingProgress("Generation complete, formatting...");
            } else if (event.type === "error") {
              // 捕获错误但不抛出，避免被 client.ts 的 catch 屏蔽
              const message = event.message as string;
              streamError = new Error(message);
            }
          },
          abortController.signal,
        );

        // 检查流处理过程中是否发生错误
        if (streamError) {
          throw streamError;
        }

        // 使用类型断言，因为 TypeScript 无法跟踪回调函数中的变量修改
        if (finalResult !== null) {
          const result = finalResult as { openapi: unknown; format_used: string };
          const openapiJson = JSON.stringify(result.openapi, null, 2);
          setOutputContent(openapiJson);
          setCharCount(openapiJson.length);
          setStreamingProgress("");
          showToast("success", `AI generation successful! Format used: ${result.format_used}`);
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : "AI generation failed";
        // 保留已生成的内容，不清除 outputContent
        if (e instanceof Error && e.message.includes("cancelled")) {
          setStreamingProgress("");
          // 取消时不显示错误，已生成的内容保留
        } else {
          setError(errMsg);
          showToast("error", errMsg);
        }
      } finally {
        abortRef.current = null;
        stopTimer();
        setIsLoading(false);
      }
      return;
    }

    if (!inputValue.trim()) {
      setInputError("Please enter API specification");
      showToast("error", "Please enter API specification");
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
        setInputError("Invalid JSON format, please check input");
        showToast("error", "Invalid JSON format");
        setIsLoading(false);
        return;
      }

      const { content } = inputMode === "openapi"
        ? await importOpenAPI(parseResult, outputFormat)
        : await generateDoc(parseResult, outputFormat);

      setOutputContent(content);
      showToast("success", "Document generated successfully!");
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Generation failed";
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
      showToast("success", "Copied to clipboard");
    } catch {
      showToast("error", "Copy failed");
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
            Custom API Spec
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
                    OpenAPI Import
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
            AI Generate
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-220px)]">
          {/* Left Panel - Input */}
          <div className="card flex flex-col p-4 h-full">
            {inputMode === "ai" ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">
                    AI Generate Endpoint
                  </h2>
                  <span className="text-xs text-purple-500 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded">
                    Natural Language Description
                  </span>
                </div>

                <div className="flex-1">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={"Describe the API endpoint you want to generate in natural language, e.g.:\nUser login endpoint, accepts phone number and verification code, returns JWT token\n\nOr more detailed:\nA todo service with create, query, update, delete operations"}
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
                    {inputMode === "spec" ? "API Spec Input" : "OpenAPI Import"}
                  </h2>
                  <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                    JSON Format
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
                        : 'Paste OpenAPI 3.0 spec, e.g.:\n{\n  "openapi": "3.0.0",\n  "info": {...},\n  "paths": {...}\n}'
                    }
                    height="400px"
                  />
                </div>
              </>
            )}

            <div className="mt-4 space-y-3">
              {inputMode === "ai" ? (
                isLoading ? (
                  // Generating: show progress and cancel button
                  <div className="space-y-3">
                    {streamingProgress && (
                      <p className="text-sm text-purple-600 dark:text-purple-400 text-center">
                        {streamingProgress}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={cancelGeneration}
                      className="w-full bg-red-500 hover:bg-red-600 text-white py-3 text-base font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Generation
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!inputValue.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white py-3 text-base font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    AI Generate Endpoint
                  </button>
                )
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
                streaming={isLoading}
                elapsedSeconds={elapsedSeconds}
                charCount={charCount}
                streamingProgress={streamingProgress}
                onCancel={cancelGeneration}
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
