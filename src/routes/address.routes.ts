import { Hono } from "hono";
import { pool } from "../db.js";
import { userIdParamSchema, addressIdParamSchema } from "../validators/user.schema.js";
import { createAddressSchema } from "../validators/address.schema.js";

const addressApp = new Hono();

// Create address for user
addressApp.post("/", async (c) => {
  try {
    // Validate userId param
    const userIdParsed = userIdParamSchema.safeParse({ userId: c.req.param("userId") });
    if (!userIdParsed.success) {
      return c.json({ error: userIdParsed.error.issues[0].message }, 400);
    }
    const { userId } = userIdParsed.data;

    // Validate body
    const body = await c.req.json();
    const validatedAddress = createAddressSchema.safeParse(body);
    if (!validatedAddress.success) {
      return c.json({ message: "Validation error", errors: validatedAddress.error.issues[0].message }, 400);
    }

    // Check if user exists
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    // Insert address
    const { address_line, city, state, postal_code, country } = validatedAddress.data;
    const result = await pool.query(
      `INSERT INTO addresses (user_id, address_line, city, state, postal_code, country)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, address_line, city, state, postal_code, country]
    );

    return c.json(result.rows[0], 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Get all addresses of a user
addressApp.get("/", async (c) => {
  try {
    const userIdParsed = userIdParamSchema.safeParse({ userId: c.req.param("userId") });
    if (!userIdParsed.success) {
      return c.json({ error: userIdParsed.error.issues[0].message }, 400);
    }
    const { userId } = userIdParsed.data;

    // Check if user exists
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    const result = await pool.query("SELECT * FROM addresses WHERE user_id = $1 ORDER BY id", [userId]);
    return c.json(result.rows);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Get all addresses (all users)
addressApp.get("/", async (c) => {
  try {
    const result = await pool.query("SELECT * FROM addresses ORDER BY id");
    return c.json(result.rows);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// Update an address of a user (partial updates allowed)
addressApp.put("/:addressId", async (c) => {
  try {
    // Validate params
    const userIdParsed = userIdParamSchema.safeParse({ userId: c.req.param("userId") });
    const addressIdParsed = addressIdParamSchema.safeParse({ addressId: c.req.param("addressId") });

    if (!userIdParsed.success) {
      return c.json({ error: userIdParsed.error.issues[0].message }, 400);
    }
    if (!addressIdParsed.success) {
      return c.json({ error: addressIdParsed.error.issues[0].message }, 400);
    }

    const { userId } = userIdParsed.data;
    const { addressId } = addressIdParsed.data;

    // Check if user exists
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    // Check if address belongs to user
    const addressCheck = await pool.query(
      "SELECT * FROM addresses WHERE id = $1 AND user_id = $2",
      [addressId, userId]
    );
    if (addressCheck.rows.length === 0) {
      return c.json({ error: "Address not found for this user" }, 404);
    }

    const body = await c.req.json();
    const partialAddressSchema = createAddressSchema.partial();
    const bodyParsed = partialAddressSchema.safeParse(body);
    if (!bodyParsed.success) {
      return c.json({ message: "Validation error", errors: bodyParsed.error.issues[0].message}, 400);
    }

    const fields = Object.keys(bodyParsed.data) as (keyof typeof bodyParsed.data)[];
    if (fields.length === 0) {
      return c.json({ message: "No fields provided to update" }, 400);
    }

const values = fields.map((field) => bodyParsed.data[field] as string);
values.push(addressId.toString());  // <-- convert number to string here

const setClauses = fields.map((field, index) => `${field} = $${index + 1}`).join(", ");
const updateQuery = `UPDATE addresses SET ${setClauses} WHERE id = $${values.length} RETURNING *`;

const updateResult = await pool.query(updateQuery, values);


    return c.json(updateResult.rows[0]);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});
// Delete an address of a user
addressApp.delete("/:addressId", async (c) => {
  try {
    // Validate params
    const userIdParsed = userIdParamSchema.safeParse({
      userId: c.req.param("userId"),
    });
    const addressIdParsed = addressIdParamSchema.safeParse({
      addressId: c.req.param("addressId"),
    });

    if (!userIdParsed.success) {
      return c.json(
        { error: userIdParsed.error.issues[0].message },
        400
      );
    }

    if (!addressIdParsed.success) {
      return c.json(
        { error: addressIdParsed.error.issues[0].message },
        400
      );
    }

    const { userId } = userIdParsed.data;
    const { addressId } = addressIdParsed.data;

    // Check if user exists
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    // Delete address only if it belongs to user
    const deleteResult = await pool.query(
      "DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING *",
      [addressId, userId]
    );

    if (deleteResult.rows.length === 0) {
      return c.json(
        { error: "Address not found for this user" },
        404
      );
    }

    return c.json({
      message: "Address deleted successfully",
      deletedAddress: deleteResult.rows[0],
    });
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});
addressApp.get("/users/address-count", async (c) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, COUNT(a.id) AS address_count
      FROM users u
      LEFT JOIN addresses a ON u.id = a.user_id
      GROUP BY u.id, u.name
      ORDER BY u.name;
    `);
    return c.json(result.rows);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});
addressApp.get("/users/no-address", async (c) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email
      FROM users u
      LEFT JOIN addresses a ON u.id = a.user_id
      WHERE a.id IS NULL
      ORDER BY u.name;
    `);

    return c.json(result.rows);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default addressApp;
