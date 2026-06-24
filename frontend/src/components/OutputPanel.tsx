import { useEffect, useMemo, useRef } from "react";
import { markdownToHtml } from "../utils/markdown";
import type { OutputFormat } from "../types";

interface OutputPanelProps {
  content: string;
  format: OutputFormat;
  loading: boolean;
  error: string | null;
  streaming?: boolean;
  elapsedSeconds?: number;
  charCount?: number;
  streamingProgress?: string;
  onCancel?: () => void;
  onCopy: () => void;
  onDownload: () => void;
}

export function OutputPanel({
  content,
  format,
  loading,
  error,
  streaming = false,
  elapsedSeconds = 0,
  charCount = 0,
  streamingProgress = "",
  onCancel,
  onCopy,
  onDownload,
}: OutputPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // HTML escape function
  const escapeHtml = (s: string): string => {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  // Update iframe when HTML content changes
  useEffect(() => {
    if (format !== "html" || !content) return;

    // Delay to next frame to ensure iframe is mounted
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

    // Use setTimeout to ensure iframe is fully mounted
    timeoutId = window.setTimeout(updateIframe, 0);

    return () => {
      isCancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [content, format]);

  // JSON syntax highlighting function
  const highlightJson = (jsonStr: string): string => {
    // Escape HTML characters
    let escaped = escapeHtml(jsonStr);
    // Highlight JSON syntax
    // Match strings (keys in key-value pairs or plain string values)
    escaped = escaped.replace(
      /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?/g,
      (match, str, colon, keyword) => {
        let cls = "json-number";
        let text = match;
        if (str !== undefined) {
          // String
          if (colon !== undefined) {
            // This is a key
            cls = "json-key";
          } else {
            // This is a string value
            cls = "json-string";
          }
          text = str;
        } else if (keyword !== undefined) {
          // Keywords true/false/null
          cls = "json-keyword";
          text = keyword;
        } else {
          // Number
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
        <p className="text-sm">
          {streamingProgress || "Generating document..."}
        </p>
        {streaming && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {charCount} chars generated · {elapsedSeconds}s elapsed
          </p>
        )}
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
        <p className="text-sm">Enter API specification and click "Generate Document"</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Supports custom format and OpenAPI spec</p>
      </div>
    );
  }

  // HTML format: use iframe to display full HTML document
  if (format === "html") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Preview
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">HTML</span>
            {elapsedSeconds > 0 && (
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                {charCount} chars · {elapsedSeconds}s elapsed
              </span>
            )}
          </span>
          <div className="flex gap-2">
            {onCancel && streaming && (
              <button
                onClick={onCancel}
                className="btn-ghost text-xs text-red-500"
                title="Cancel generation"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            )}
            <button
              onClick={() => {
                const newWindow = window.open();
                if (newWindow) {
                  newWindow.document.write(content);
                  newWindow.document.close();
                  newWindow.document.title = "API Docs (HTML)";
                }
              }}
              className="btn-ghost text-xs"
              title="Open in new window"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open
            </button>
            <button onClick={onCopy} className="btn-ghost text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </button>
            <button onClick={onDownload} className="btn-ghost text-xs">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>
        </div>
        <iframe
          ref={iframeRef}
          className="flex-1 w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900"
          sandbox="allow-same-origin"
          title="HTML Preview"
        />
      </div>
    );
  }

  // Markdown or JSON format
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Preview
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
              {format === "markdown" ? "Markdown → HTML" : "JSON"}
            </span>
            {elapsedSeconds > 0 && (
              <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                {charCount} chars · {elapsedSeconds}s elapsed
              </span>
            )}
          </span>
          <div className="flex gap-2">
            {onCancel && streaming && (
              <button
                onClick={onCancel}
                className="btn-ghost text-xs text-red-500"
                title="Cancel generation"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            )}
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
              Copy
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
              Download
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
