import type { Context, Next } from "hono";

export const loggingMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  const method = c.req.method;
  const path = c.req.url;
  const status = c.res.status;
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${method} ${path} ${status} ${duration}ms`);
};
