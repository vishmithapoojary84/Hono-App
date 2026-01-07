import { Hono } from "hono";
import { serve } from "@hono/node-server";
import userApp from "./routes/user.routes.js";

import {responseFormatter } from "./middlewares/responseFormatter.js";
import { loggingMiddleware } from "./middlewares/loggingMiddleware.js";
const app = new Hono();
app.use("*", loggingMiddleware);
app.use("*", responseFormatter);
app.route("/users", userApp);


app.get("/", (c) => c.text("Hello Hono"));

serve(
  { fetch: app.fetch, port: 3000 },
  () => console.log("Server running on http://localhost:3000")
);
