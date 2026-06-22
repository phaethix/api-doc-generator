// middleware/logger.ts

export function logRequest(req: Request, res: Response, duration: number): void {
  const url = new URL(req.url);
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${url.pathname} → ${res.status} (${duration}ms)`,
  );
}
