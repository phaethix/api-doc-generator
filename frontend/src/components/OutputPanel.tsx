import { useEffect, useMemo, useRef } from "react";
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // HTML 转义函数
  const escapeHtml = (s: string): string => {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  // 当 HTML 内容变更时，更新 iframe
  useEffect(() => {
    if (format !== "html" || !content) return;

    // 延迟到下一帧确保 iframe 已挂载
    let timeoutId: number | null = null;
    let isCancelled = false;

    const updateIframe = () => {
      if (isCancelled) return;
      const iframe = iframeRef.current;
      if (!iframe) return;

      try {
        const doc = iframe.contentDocument;
        if (doc) {
          doc.open();
          doc.write(content);
          doc.close();
        }
      } catch (err) {
        console.error("Failed to update iframe:", err);
      }
    };

    // 使用 setTimeout 确保 iframe 已完全挂载
    timeoutId = window.setTimeout(updateIframe, 0);

    return () => {
      isCancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [content, format]);

  // JSON 语法高亮函数
  const highlightJson = (jsonStr: string): string => {
    // 转义 HTML 字符
    let escaped = escapeHtml(jsonStr);
    // 高亮 JSON 语法
    // 匹配字符串（键值对中的键或普通字符串值）
    escaped = escaped.replace(
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?/g,
      (match, str, colon, keyword) => {
        let cls = "json-number";
        let text = match;
        if (str !== undefined) {
          // 字符串
          if (colon !== undefined) {
            // 这是键
            cls = "json-key";
          } else {
            // 这是字符串值
            cls = "json-string";
          }
          text = str;
        } else if (keyword !== undefined) {
          // 关键字 true/false/null
          cls = "json-keyword";
          text = keyword;
        } else {
          // 数字
          text = match;
        }
        return `<span class="${cls}">${text}</span>`;
      },
    );
    return escaped;
  };

  const renderedContent = useMemo(() => {
    if (format === "markdown") {
      return markdownToHtml(content);
    }
    if (format === "json") {
      try {
        const parsed = JSON.parse(content);
        const formatted = JSON.stringify(parsed, null, 2);
        return `<pre class="json-pre"><code>${highlightJson(formatted)}</code></pre>`;
      } catch {
        return `<pre class="json-pre"><code>${highlightJson(content)}</code></pre>`;
      }
    }
    return content;
  }, [content, format]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
        <div className="w-10 h-10 border-3 border-primary-200 dark:border-primary-800 border-t-primary-600 rounded-full animate-spin mb-4" />
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
      <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
        <svg className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm">输入 API 规范后点击"生成文档"按钮</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">支持自定义格式和 OpenAPI 规范</p>
      </div>
    );
  }

  // HTML 格式：使用 iframe 展示完整 HTML 文档
  if (format === "html") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            预览
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">HTML</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                // 在浏览器中打开新窗口
                const newWindow = window.open();
                if (newWindow) {
                  newWindow.document.write(content);
                  newWindow.document.close();
                  newWindow.document.title = "API 文档 (HTML)";
                }
              }}
              className="btn-ghost text-xs"
              title="在新窗口中打开"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              打开
            </button>
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
        <iframe
          ref={iframeRef}
          className="flex-1 w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
          sandbox="allow-same-origin"
          title="HTML 预览"
        />
      </div>
    );
  }

  // Markdown 或 JSON 格式
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          预览
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
            {format === "markdown" ? "Markdown → HTML" : "JSON"}
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
      <div
        className="flex-1 overflow-auto markdown-body"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
    </div>
  );
}
