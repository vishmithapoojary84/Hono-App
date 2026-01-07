import type { Context, Next } from "hono";
import type { StatusCode } from "hono/utils/http-status";

export const responseFormatter = async (c: Context, next: Next) => {
  await next();

  const res = c.res;
  const cloned = res.clone();

  let body: any = null;
  try {
    body = await cloned.json();
  } catch {
    body = null;
  }

  const success = res.status >= 200 && res.status < 300;

  const formattedResponse = {
    success,
    data: body,
    message: success ? "Operation successful" : "An error occurred",
  };

  // ✅ Replace the response instead of returning a new one
  c.res = new Response(JSON.stringify(formattedResponse), {
    status: res.status as StatusCode,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
