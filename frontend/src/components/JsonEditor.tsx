import { useRef, useCallback } from "react";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string | null;
  height?: string;
}

export function JsonEditor({
  value,
  onChange,
  placeholder,
  label,
  error,
  height = "400px",
}: JsonEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.substring(0, start) + "  " + value.substring(end);
        onChange(newValue);

        // Restore cursor position
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
          }
        });
      }
    },
    [value, onChange],
  );

  return (
    <div className="flex flex-col h-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">{label}</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                try {
                  const formatted = JSON.stringify(JSON.parse(value), null, 2);
                  onChange(formatted);
                } catch {
                  // ignore if invalid JSON
                }
              }}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              title="Format JSON"
            >
              Format
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Clear"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className={`relative flex-1 rounded-lg border ${error ? "border-red-300 dark:border-red-600" : "border-gray-300 dark:border-gray-700"} bg-white dark:bg-gray-800 overflow-hidden`} style={{ minHeight: height }}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full h-full p-4 font-mono text-sm leading-relaxed text-gray-800 dark:text-gray-100 bg-transparent resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500"
          style={{ tabSize: 2 }}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
