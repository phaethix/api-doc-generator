import { useMemo } from "react";
import { markdownToHtml } from "../utils/markdown";
import type { OutputFormat } from "../types";

interface OutputPanelProps {
  content: string;
  format: OutputFormat;
  loading: boolean;
  error: string | null;
  onCopy: () => void;
  onDownload: () => void;
}

export function OutputPanel({
  content,
  format,
  loading,
  error,
  onCopy,
  onDownload,
}: OutputPanelProps) {
  const renderedHtml = useMemo(() => {
    if (format === "markdown") {
      return markdownToHtml(content);
    }
    if (format === "html") {
      return content;
    }
    if (format === "json") {
      try {
        const parsed = JSON.parse(content);
        return `<pre class="!bg-gray-900 !text-gray-100 p-4 rounded-lg overflow-x-auto"><code>${escapeHtml(
          JSON.stringify(parsed, null, 2),
        )}</code></pre>`;
      } catch {
        return `<pre class="!bg-gray-900 !text-gray-100 p-4 rounded-lg overflow-x-auto"><code>${escapeHtml(content)}</code></pre>`;
      }
    }
    return content;
  }, [content, format]);

  const escapeHtml = (s: string): string => {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
        <p className="text-sm">正在生成文档...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm">输入 API 规范后点击"生成文档"按钮</p>
        <p className="text-xs text-gray-400 mt-1">支持自定义格式和 OpenAPI 规范</p>
      </div>
    );
  }

  if (format === "markdown" || format === "html") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            预览
            <span className="ml-2 text-xs text-gray-400">
              {format === "markdown" ? "Markdown → HTML" : "HTML"}
            </span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCopy}
              className="btn-ghost text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              复制
            </button>
            <button
              onClick={onDownload}
              className="btn-ghost text-xs"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              下载
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto markdown-body" dangerouslySetInnerHTML={{ __html: renderedHtml }} />
      </div>
    );
  }

  // JSON
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">
          JSON 输出
        </span>
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            className="btn-ghost text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            复制
          </button>
          <button
            onClick={onDownload}
            className="btn-ghost text-xs"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            下载
          </button>
        </div>
      </div>
      <div
        className="flex-1 overflow-auto"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
}
