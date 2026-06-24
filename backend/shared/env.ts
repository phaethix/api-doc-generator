// shared/env.ts — Load .env from project root into Deno.env.
//
// Centralized so backend/main.ts and any future bootstrap code share one
// implementation.
//
// The .env file lives at the project root (sibling to backend/), so callers
// must pass their own directory as `from` (typically `import.meta.dirname`).
// This avoids the ambiguity of `import.meta.dirname` inside this utility,
// which would otherwise resolve to `backend/shared/`.

import { load } from "jsr:@std/dotenv";
import { resolve } from "jsr:@std/path";

export interface LoadEnvOptions {
  /** Caller's directory. Use `import.meta.dirname`. Required. */
  from: string;
  /** .env file path relative to project root. Defaults to ".env". */
  envFile?: string;
}

/**
 * Load .env from project root and inject into Deno.env.
 *
 * @returns Absolute path of the loaded .env file, or null if not found.
 *
 * @example
 * ```ts
 * await loadProjectEnv({ from: import.meta.dirname });
 * ```
 */
export async function loadProjectEnv(opts: LoadEnvOptions): Promise<string | null> {
  // Caller is something like backend/main.ts → backend/.
  // Project root is one level up from there.
  const projectRoot = resolve(opts.from, "..");
  const envPath = resolve(projectRoot, opts.envFile ?? ".env");

  try {
    const parsed = await load({ envPath });
    for (const [k, v] of Object.entries(parsed)) {
      Deno.env.set(k, v);
    }
    return envPath;
  } catch {
    // .env missing is not fatal — rely on real env vars.
    return null;
  }
}
