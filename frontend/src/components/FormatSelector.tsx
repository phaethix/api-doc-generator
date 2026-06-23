import type { OutputFormat } from "../types";

interface FormatSelectorProps {
  value: OutputFormat;
  onChange: (format: OutputFormat) => void;
}

const formats: { value: OutputFormat; label: string; description: string; icon: string }[] = [
  {
    value: "markdown",
    label: "Markdown",
    description: "适合 README 和文档站点",
    icon: "M2 3h20v18H2V3zm2 2v14h16V5H4zm2 2h12v2H6V7zm0 4h12v2H6v-2zm0 4h8v2H6v-2z",
  },
  {
    value: "html",
    label: "HTML",
    description: "可直接在浏览器中查看",
    icon: "M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h6v2H7v-2z",
  },
  {
    value: "json",
    label: "JSON",
    description: "结构化数据，便于程序处理",
    icon: "M4 2h16a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm0 4v12h16V6H4zm2 2h12v2H6V8zm0 4h12v2H6v-2z",
  },
];

export function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="label">输出格式</label>
      <div className="grid grid-cols-3 gap-2">
        {formats.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onChange(f.value)}
            className={`relative p-3 rounded-lg border-2 transition-all duration-200 text-left ${
              value === f.value
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <svg
                className={`w-4 h-4 ${value === f.value ? "text-primary-600 dark:text-primary-400" : "text-gray-500 dark:text-gray-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={f.icon}
                />
              </svg>
              <span
                className={`text-sm font-semibold ${
                  value === f.value ? "text-primary-700 dark:text-primary-300" : "text-gray-700 dark:text-gray-200"
                }`}
              >
                {f.label}
              </span>
              {value === f.value && (
                <svg
                  className="w-4 h-4 text-primary-600 dark:text-primary-400 ml-auto"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{f.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
