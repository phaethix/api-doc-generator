import React from "react";

type OutputFormat = "markdown" | "html" | "json";

interface ResultData {
  content: string;
  format: OutputFormat;
}

interface Props {
  result: ResultData | null;
  isLoading: boolean;
}

export default function ResultPanel({ result, isLoading }: Props) {
  if (!result && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-8 text-center min-h-[400px]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-slate-400">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <h3 className="mt-6 text-lg font-semibold text-slate-700">等待生成</h3>
        <p className="mt-2 text-sm text-slate-400 max-w-xs">
          在左侧输入 API 规范，点击"生成文档"按钮查看结果
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 p-8 min-h-[400px]">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-brand-100" />
          <div className="absolute inset-0 h-16 w-16 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
        </div>
        <p className="mt-6 text-sm font-medium text-slate-600">正在生成文档...</p>
      </div>
    );
  }

  const { content, format } = result!;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const renderContent = () => {
    if (format === "html") {
      return (
        <iframe
          srcDoc={content}
          title="Generated HTML Documentation"
          className="w-full h-[500px] rounded-lg border border-slate-200"
          sandbox="allow-same-origin"
        />
      );
    }

    if (format === "json") {
      return (
        <pre className="overflow-auto whitespace-pre rounded-xl border border-slate-200 bg-slate-50/50 p-4 font-mono text-sm leading-relaxed text-slate-800 max-h-[500px]">
          {content}
        </pre>
      );
    }

    // Markdown - render as formatted text
    return (
      <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-50/50 p-6 max-h-[500px] prose prose-slate prose-sm">
        <MarkdownRenderer content={content} />
      </div>
    );
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-emerald-600">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-slate-900">生成结果</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 uppercase">
            {format}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          复制
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-5">
        {renderContent()}
      </div>
    </div>
  );
}

// Simple markdown renderer for displaying generated markdown documents
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const htmlLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("# ")) {
      htmlLines.push(`<h1 class="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2 mb-3">${escapeAndFormat(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      htmlLines.push(`<h2 class="text-lg font-bold text-slate-800 mt-4 mb-2">${escapeAndFormat(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      htmlLines.push(`<h3 class="text-base font-semibold text-slate-700 mt-3 mb-1">${escapeAndFormat(line.slice(4))}</h3>`);
    } else if (line.startsWith("> ")) {
      htmlLines.push(`<p class="text-sm text-slate-500 italic">${escapeAndFormat(line.slice(2))}</p>`);
    } else if (line.startsWith("---")) {
      htmlLines.push(`<hr class="border-slate-200 my-3" />`);
    } else if (line.startsWith("|")) {
      htmlLines.push(line);
    } else if (line.trim() === "") {
      htmlLines.push(`<br />`);
    } else {
      htmlLines.push(`<p class="text-sm text-slate-700">${escapeAndFormat(line)}</p>`);
    }
  }

  // Process tables
  const finalHtml = processTables(htmlLines.join("\n"));

  return (
    <div
      className="text-sm"
      dangerouslySetInnerHTML={{ __html: finalHtml }}
    />
  );
}

function escapeAndFormat(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function processTables(html: string): string {
  // Split into lines and group table lines
  const lines = html.split("\n");
  let result = "";
  let inTable = false;
  let tableLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableLines = [];
      }
      tableLines.push(line);
    } else {
      if (inTable) {
        result += renderTable(tableLines);
        inTable = false;
        tableLines = [];
      }
      result += line + "\n";
    }
  }

  if (inTable) {
    result += renderTable(tableLines);
  }

  return result;
}

function renderTable(lines: string[]): string {
  // Filter out separator lines (|---|---|)
  const dataLines = lines.filter((l) => !l.match(/^\|[\s-:|]+\|$/));

  if (dataLines.length === 0) return "";

  let tableHtml = '<table class="w-full border-collapse my-3 text-xs">';

  for (let i = 0; i < dataLines.length; i++) {
    const cells = dataLines[i]
      .split("|")
      .filter((c) => c.trim() !== "")
      .map((c) => c.trim());

    const tag = i === 0 ? "th" : "td";
    const bgClass = i === 0 ? "bg-slate-100 font-semibold" : "";
    const cellHtml = cells
      .map((c) => `<${tag} class="border border-slate-200 px-3 py-2 text-left ${bgClass}">${c}</${tag}>`)
      .join("");

    tableHtml += `<tr>${cellHtml}</tr>`;
  }

  tableHtml += "</table>";
  return tableHtml;
}
