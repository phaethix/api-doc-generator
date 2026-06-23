import React from "react";
import GeneratorForm from "./components/GeneratorForm";
import ResultPanel from "./components/ResultPanel";

const SAMPLE_SPEC = `{
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
      },
      "post": {
        "summary": "Create a user",
        "tags": ["users"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "type": "object" }
            }
          }
        },
        "responses": {
          "201": { "description": "User created" }
        }
      }
    },
    "/users/{id}": {
      "get": {
        "summary": "Get user by ID",
        "tags": ["users"],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": { "description": "A single user" },
          "404": { "description": "User not found" }
        }
      },
      "delete": {
        "summary": "Delete user",
        "tags": ["users"],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "204": { "description": "Deleted" }
        }
      }
    }
  },
  "tags": [
    { "name": "users", "description": "User management endpoints" }
  ]
}`;

type OutputFormat = "markdown" | "html" | "json";

interface ResultData {
  content: string;
  format: OutputFormat;
}

export default function App() {
  const [input, setInput] = React.useState(SAMPLE_SPEC);
  const [format, setFormat] = React.useState<OutputFormat>("markdown");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ResultData | null>(null);
  const [inputMode, setInputMode] = React.useState<"paste" | "upload">("paste");

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
        setInput(text);
        setInputMode("paste");
      } catch (err) {
        setError(`文件解析失败: ${err instanceof Error ? err.message : "无效的 JSON"}`);
      }
    };
    reader.onerror = () => setError("读取文件失败");
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!input.trim()) {
      setError("请输入 API 规范内容");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      JSON.parse(input);
      const res = await fetch(`/api/generate?format=${format}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: input,
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
    setInput("");
    setResult(null);
    setError(null);
  };

  const handleLoadSample = () => {
    setInput(SAMPLE_SPEC);
    setError(null);
  };

  const handleFormatChange = (newFormat: OutputFormat) => {
    setFormat(newFormat);
    if (result && input.trim()) {
      // Re-generate with new format
      setTimeout(() => handleGenerate(), 0);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 shadow-md shadow-brand-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-white">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                API Doc Generator
              </h1>
            </div>
            <span className="text-xs font-medium text-slate-400">v1.0.0</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-brand-400/20 via-cyan-400/15 to-purple-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              将 OpenAPI 规范转化为
              <span className="bg-gradient-to-r from-brand-600 to-brand-700 bg-clip-text text-transparent">精美文档</span>
            </h2>
            <p className="mt-3 text-base text-slate-500 max-w-2xl mx-auto">
              粘贴或上传你的 OpenAPI/Swagger JSON，即时生成 Markdown、HTML 或 JSON 格式的 API 文档
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GeneratorForm
            input={input}
            setInput={setInput}
            inputMode={inputMode}
            setInputMode={setInputMode}
            format={format}
            onFormatChange={handleFormatChange}
            isLoading={isLoading}
            error={error}
            onGenerate={handleGenerate}
            onClear={handleClear}
            onLoadSample={handleLoadSample}
            onFileUpload={handleFileUpload}
          />
          <ResultPanel result={result} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
