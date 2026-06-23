// legacy_handler.ts
// 向后兼容的 handler 导出，供旧测试使用
// 新的全栈应用使用 Fresh 框架，通过 routes/ 目录进行路由管理
import { resolveRoute } from "./router.ts";
import { logRequest } from "./middleware/logger.ts";

export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const start = performance.now();
  const route = resolveRoute(req.method, url);

  let res: Response;
  if (route) {
    res = await route(req);
  } else {
    res = new Response("Not Found", { status: 404 });
  }

  logRequest(req, res, Math.round(performance.now() - start));
  return res;
}
