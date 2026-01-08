import { Hono } from "hono";
import { pool } from "../db.js";
import { userIdParamSchema, addressIdParamSchema } from "../validators/user.schema.js";
import { createAddressSchema } from "../validators/address.schema.js";

const addressApp = new Hono();

addressApp.post("/", async (c) => {
  try {
  
    const userIdParsed = userIdParamSchema.safeParse({ userId: c.req.param("userId") });
    if (!userIdParsed.success) {
      return c.json({ error: userIdParsed.error.issues[0].message }, 400);
    }
    const { userId } = userIdParsed.data;

    
    const body = await c.req.json();
    const validatedAddress = createAddressSchema.safeParse(body);
    if (!validatedAddress.success) {
      return c.json({ message: "Validation error", errors: validatedAddress.error.issues[0].message }, 400);
    }

    
    const userCheck = await pool.query("SELECT id FROM users WHERE id = $1", [userId]);
    if (userCheck.rows.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

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

addressApp.get("/", async (c) => {
  try {
    const userIdParsed = userIdParamSchema.safeParse({ userId: c.req.param("userId") });
    if (!userIdParsed.success) {
      return c.json({ error: userIdParsed.error.issues[0].message }, 400);
    }
    const { userId } = userIdParsed.data;
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


addressApp.get("/", async (c) => {
  try {
    const result = await pool.query("SELECT * FROM addresses ORDER BY id");
    return c.json(result.rows);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});


addressApp.put("/:addressId", async (c) => {
  try {
    const { userId, addressId } = {
      userId: Number(c.req.param("userId")),
      addressId: Number(c.req.param("addressId")),
    };

    const body = await c.req.json();

    const parsed = createAddressSchema.partial().safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0].message }, 400);
    }

   
    const result = await pool.query(
      `UPDATE addresses
       SET
         address_line = COALESCE($1, address_line),
         city         = COALESCE($2, city),
         state        = COALESCE($3, state),
         postal_code  = COALESCE($4, postal_code),
         country      = COALESCE($5, country)
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        parsed.data.address_line,
        parsed.data.city,
        parsed.data.state,
        parsed.data.postal_code,
        parsed.data.country,
        addressId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return c.json({ error: "Address not found for this user" }, 404);
    }

    return c.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});


addressApp.delete("/:addressId", async (c) => {
  try {
   
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

   
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

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
// addressApp.get("/users/address-count", async (c) => {
//   try {
//     const result = await pool.query(`
//       SELECT u.id, u.name, COUNT(a.id) AS address_count
//       FROM users u
//       LEFT JOIN addresses a ON u.id = a.user_id
//       GROUP BY u.id, u.name
//       ORDER BY u.name;
//     `);
//     return c.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     return c.json({ error: "Internal Server Error" }, 500);
//   }
// });
// addressApp.get("/users/no-address", async (c) => {
//   try {
//     const result = await pool.query(`
//       SELECT u.id, u.name, u.email
//       FROM users u
//       LEFT JOIN addresses a ON u.id = a.user_id
//       WHERE a.id IS NULL
//       ORDER BY u.name;
//     `);

//     return c.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     return c.json({ error: "Internal Server Error" }, 500);
//   }
// });

export default addressApp;
