// genai/errors.ts — Centralized error types for the genai module.
//
// Two distinct error families:
//   - LLMError       : raised when the LLM provider returns an error
//                      (auth failure, rate limit, server error, network issue)
//   - LLMConfigError : raised when the client is misconfigured
//                      (missing API key, invalid parameters)

// Error categories
export type LLMErrorCategory =
  | "auth" // 401 / 403 — bad or missing key
  | "rate_limit" // 429 — too many requests
  | "server" // 5xx — upstream provider error
  | "network" // DNS / timeout / connection refused
  | "unknown"; // any other failure

// Provider errors
export class LLMError extends Error {
  constructor(
    message: string,
    public readonly category: LLMErrorCategory,
    public readonly status?: number,
    public readonly provider?: string,
  ) {
    super(message);
    this.name = "LLMError";
  }

  /** Convenience: build a structured JSON representation for API responses. */
  toJSON() {
    return {
      name: this.name,
      category: this.category,
      status: this.status,
      provider: this.provider,
      message: this.message,
    };
  }
}

// Configuration errors
export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConfigError";
  }
}
