// handlers/static.ts
// Serves the built frontend SPA and its assets.

import { contentType } from "jsr:@std/media-types@1";

// Resolve the path to frontend/dist relative to the project root.
// In Deno, import.meta.url gives the file:// URL of the current module.
// Since this file is in backend/handlers/, we need to go up two levels.
const STATIC_ROOT = new URL("../../frontend/dist/", import.meta.url);

// Default files to serve when the path ends with /
const INDEX_FILES = ["index.html"];

interface StaticRoute {
  method: string;
  pattern: URLPattern;
}

export const staticRoute: StaticRoute = {
  method: "GET",
  // Catch-all for GET requests that don't match API routes
  pattern: new URLPattern({ pathname: "/*" }),
};

/**
 * Safely resolve a request path to a file path within the static root.
 * Prevents directory traversal attacks.
 */
function resolveSafePath(requestPath: string): string | null {
  // Normalize: remove leading slash
  let normalized = requestPath.replace(/^\/+/, "");

  // Default to index.html for root
  if (normalized === "") {
    normalized = "index.html";
  }

  // Resolve the absolute path
  const resolved = new URL(normalized, STATIC_ROOT);

  // Ensure the resolved path is within the static root
  const resolvedPath = resolved.pathname;
  const rootPath = STATIC_ROOT.pathname;

  if (!resolvedPath.startsWith(rootPath)) {
    return null;
  }

  return resolvedPath;
}

/**
 * Get the MIME content type for a file based on its extension.
 */
function getContentType(filePath: string): string {
  const extension = filePath.substring(filePath.lastIndexOf("."));
  const type = contentType(extension);
  return type ?? "application/octet-stream";
}

/**
 * Serve a static file from the dist directory.
 */
async function serveFile(filePath: string): Promise<Response | null> {
  try {
    const fileInfo = await Deno.stat(filePath);

    if (fileInfo.isDirectory) {
      // Try index.html in the directory
      for (const indexFile of INDEX_FILES) {
        const indexPath = `${filePath}/${indexFile}`;
        try {
          const indexInfo = await Deno.stat(indexPath);
          if (indexInfo.isFile) {
            const content = await Deno.readFile(indexPath);
            const type = getContentType(indexPath);
            return new Response(content, {
              status: 200,
              headers: {
                "Content-Type": type,
                "Cache-Control": "public, max-age=3600",
              },
            });
          }
        } catch {
          continue;
        }
      }
      return null;
    }

    const content = await Deno.readFile(filePath);
    const type = getContentType(filePath);

    // HTML files should not be cached aggressively (for SPA updates)
    const cacheControl = type.includes("text/html")
      ? "no-cache"
      : "public, max-age=31536000, immutable";

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": cacheControl,
      },
    });
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return null;
    }
    console.error("Error serving file:", e);
    throw e;
  }
}

/**
 * Determine if a path is an API endpoint.
 * API endpoints are: /health, /generate, /import/*
 */
function isApiPath(pathname: string): boolean {
  return pathname === "/health" ||
         pathname.startsWith("/generate") ||
         pathname.startsWith("/import/") ||
         pathname === "/import" ||
         pathname.startsWith("/api/");
}

/**
 * Main handler for static file serving and SPA fallback.
 */
export async function handleStatic(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Don't serve SPA for API paths (they should return 404 with wrong method)
  if (isApiPath(pathname)) {
    return new Response(
      JSON.stringify({ error: `Route not found: ${req.method} ${pathname}` }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // First, try to serve the exact file
  const filePath = resolveSafePath(pathname);

  if (filePath) {
    const response = await serveFile(filePath);
    if (response) {
      return response;
    }
  }

  // If the exact file wasn't found, try SPA fallback (serve index.html)
  // This enables client-side routing for the React app
  const indexPath = new URL("index.html", STATIC_ROOT).pathname;
  try {
    const indexContent = await Deno.readFile(indexPath);
    return new Response(indexContent, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    // If even index.html doesn't exist, return a friendly 404
    return new Response("Frontend not built. Run `npm run build` in the frontend directory.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
