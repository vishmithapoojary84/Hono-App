import { Hono } from "hono";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { createUserSchema, idParamSchema } from "../validators/user.schema.js";
import addressApp from "./address.routes.js";
const userApp = new Hono();
userApp.route("/:userId/addresses", addressApp);
/** GET /users */
userApp.get("/", async (c) => {
  const result = await pool.query(
    "SELECT id, name, email, created_at FROM users"
  );
  return c.json(result.rows);
});

/** POST /users */
userApp.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: parsed.error.issues[0].message },
      400
    );
  }

  const { name, email, password } = parsed.data;
  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await pool.query(
    `INSERT INTO users (name, email, password)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, hashedPassword]
  );

  return c.json(result.rows[0], 201);
});

/** GET /users/:id */
userApp.get("/:id", async (c) => {
  const parsed = idParamSchema.safeParse(c.req.param());

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { id } = parsed.data;

  const result = await pool.query(
    "SELECT id, name, email, created_at FROM users WHERE id = $1",
    [id]
  );

  if (result.rows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(result.rows[0]);
});

/** PUT /users/:id */
userApp.put("/:id", async (c) => {
  const paramParsed = idParamSchema.safeParse(c.req.param());
  if (!paramParsed.success) {
    return c.json({ error: paramParsed.error.issues[0].message }, 400);
  }

  const body = await c.req.json();
  const bodyParsed = createUserSchema
    .omit({ password: true })
    .safeParse(body);

  if (!bodyParsed.success) {
    return c.json(
      { error: bodyParsed.error.issues[0].message },
      400
    );
  }

  const { id } = paramParsed.data;
  const { name, email } = bodyParsed.data;

  const result = await pool.query(
    `UPDATE users
     SET name = $1, email = $2
     WHERE id = $3
     RETURNING id, name, email, created_at`,
    [name, email, id]
  );

  if (result.rows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(result.rows[0]);
});

/** DELETE /users/:id */
userApp.delete("/:id", async (c) => {
  const parsed = idParamSchema.safeParse(c.req.param());

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { id } = parsed.data;

  const result = await pool.query(
    "DELETE FROM users WHERE id = $1 RETURNING id",
    [id]
  );

  if (result.rows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ message: "User deleted successfully" });
});

export default userApp;
