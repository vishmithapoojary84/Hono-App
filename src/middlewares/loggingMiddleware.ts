import type { Context, Next } from "hono";

export const loggingMiddleware = async (c: Context, next: Next) => {
  // Record start time
  const start = Date.now();

  // Let the request proceed to the next handler (route or middleware)
  await next();

  // Calculate execution time in milliseconds
  const duration = Date.now() - start;

  // Get HTTP method (GET, POST, etc.)
  const method = c.req.method;

  // Get request path (like /users/12/addresses)
  const path = c.req.url;

  // Get response status code (like 200, 404)
  const status = c.res.status;

  // Format timestamp as hh:mm:ss
  const timestamp = new Date().toLocaleTimeString();

  // Log all info to the console
  console.log(`[${timestamp}] ${method} ${path} ${status} ${duration}ms`);
};
