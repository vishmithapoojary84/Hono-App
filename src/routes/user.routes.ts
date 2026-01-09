import { Hono } from "hono";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { createUserSchema, idParamSchema } from "../validators/user.schema.js";
import addressApp from "./address.routes.js";
import { createUserWithAddressesSchema } from "../validators/transaction.schema.js";
const userApp = new Hono();
userApp.route("/:userId/addresses", addressApp);

userApp.get("/", async (c) => {
  const result = await pool.query(
    "SELECT id, name, email, created_at FROM users"
  );
  return c.json(result.rows);
});
userApp.post("/with-addresses", async (c) => {
  const client = await pool.connect();

  try {
    const body = await c.req.json();
    const parsed = createUserWithAddressesSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        {
          errors: parsed.error.issues.map((issue) => issue.message),
        },
        400
      );
    }

    const { user, addresses } = parsed.data;

    await client.query("BEGIN");

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const userResult = await client.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [user.name, user.email, hashedPassword]
    );

    const userId = userResult.rows[0].id;

    // Prepare values array and placeholders string for multi-row insert
    const values: (string | number)[] = [];
    const placeholders = addresses
      .map((addr, i) => {
        const baseIndex = i * 6;
        values.push(
          userId,
          addr.address_line,
          addr.city,
          addr.state,
          addr.postal_code,
          addr.country
        );
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
      })
      .join(", ");
      console.log("Address Insert Placeholders:", placeholders);

    const addressInsertQuery = `
      INSERT INTO addresses (user_id, address_line, city, state, postal_code, country)
      VALUES ${placeholders}
      RETURNING address_line, city, state, postal_code, country;
    `;

    const addressResult = await client.query(addressInsertQuery, values);
    const insertedAddresses = addressResult.rows;

    await client.query("COMMIT");

    return c.json(
      {
        user: userResult.rows[0],
        addresses: insertedAddresses,
      },
      201
    );

 } catch (err: unknown) {
  await client.query("ROLLBACK");
  console.error("Transaction failed:", err);

  
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as any).code === "string"
  ) {
    const code = (err as any).code;

    if (code === "23505") {
      return c.json(
        { error: "Duplicate entry: This email already exists." },
        409
      );
    }

    if (code === "23503") {
      return c.json(
        { error: "Foreign key violation: Invalid reference." },
        400
      );
    }
  }

  // fallback generic error
  return c.json({ error: "Transaction failed, rolled back" }, 500);
}
 finally {
    client.release();
  }
});


userApp.get("/no-address", async (c) => {
  const result = await pool.query(`
    SELECT u.id, u.name, u.email
    FROM users u
    LEFT JOIN addresses a ON u.id = a.user_id
    WHERE a.id IS NULL
    ORDER BY u.name;
  `);
  return c.json(result.rows);
});


userApp.get("/address-count", async (c) => {
  const result = await pool.query(`
    SELECT u.id, u.name, COUNT(a.id) AS address_count
    FROM users u
    LEFT JOIN addresses a ON u.id = a.user_id
    GROUP BY u.id, u.name
    ORDER BY u.name;
  `);
  return c.json(result.rows);
});

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
