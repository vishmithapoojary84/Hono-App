import { Hono } from "hono";
import bcrypt from "bcrypt";
import { db } from "../db.js";
import { users,addresses } from "../db/schema.js"; 
import { eq ,isNull} from "drizzle-orm"; 
import { createUserSchema, idParamSchema } from "../validators/user.schema.js";
import addressApp from "./address.routes.js";
import { createUserWithAddressesSchema } from "../validators/transaction.schema.js";
const userApp = new Hono();
userApp.route("/:userId/addresses", addressApp);

userApp.get("/", async (c) => {
  try {
    const allUsers = await db.select().from(users);
    return c.json(allUsers);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

// userApp.post("/with-addresses", async (c) => {
//   const client = await pool.connect();

//   try {
//     const body = await c.req.json();
//     const parsed = createUserWithAddressesSchema.safeParse(body);
//     if (!parsed.success) {
//       return c.json(
//         {
//           errors: parsed.error.issues.map((issue) => issue.message),
//         },
//         400
//       );
//     }

//     const { user, addresses } = parsed.data;

//     await client.query("BEGIN");

//     const hashedPassword = await bcrypt.hash(user.password, 10);

//     const userResult = await client.query(
//       `INSERT INTO users (name, email, password)
//        VALUES ($1, $2, $3)
//        RETURNING id, name, email`,
//       [user.name, user.email, hashedPassword]
//     );

//     const userId = userResult.rows[0].id;

//     // Prepare values array and placeholders string for multi-row insert
//     const values: (string | number)[] = [];
//     const placeholders = addresses
//       .map((addr, i) => {
//         const baseIndex = i * 6;
//         values.push(
//           userId,
//           addr.address_line,
//           addr.city,
//           addr.state,
//           addr.postal_code,
//           addr.country
//         );
//         return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`;
//       })
//       .join(", ");
//       console.log("Address Insert Placeholders:", placeholders);

//     const addressInsertQuery = `
//       INSERT INTO addresses (user_id, address_line, city, state, postal_code, country)
//       VALUES ${placeholders}
//       RETURNING address_line, city, state, postal_code, country;
//     `;

//     const addressResult = await client.query(addressInsertQuery, values);
//     const insertedAddresses = addressResult.rows;

//     await client.query("COMMIT");

//     return c.json(
//       {
//         user: userResult.rows[0],
//         addresses: insertedAddresses,
//       },
//       201
//     );

//  } catch (err: unknown) {
//   await client.query("ROLLBACK");
//   console.error("Transaction failed:", err);

  
//   if (
//     typeof err === "object" &&
//     err !== null &&
//     "code" in err &&
//     typeof (err as any).code === "string"
//   ) {
//     const code = (err as any).code;

//     if (code === "23505") {
//       return c.json(
//         { error: "Duplicate entry: This email already exists." },
//         409
//       );
//     }

//     if (code === "23503") {
//       return c.json(
//         { error: "Foreign key violation: Invalid reference." },
//         400
//       );
//     }
//   }

//   // fallback generic error
//   return c.json({ error: "Transaction failed, rolled back" }, 500);
// }
//  finally {
//     client.release();
//   }
// });




userApp.get("/no-address", async (c) => {
  try {
    const result = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .leftJoin(
        addresses,
        eq(users.id, addresses.userId)
      )
      .where(isNull(addresses.id))
      .orderBy(users.name);

    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});



// userApp.get("/address-count", async (c) => {
//   const result = await pool.query(`
//     SELECT u.id, u.name, COUNT(a.id) AS address_count
//     FROM users u
//     LEFT JOIN addresses a ON u.id = a.user_id
//     GROUP BY u.id, u.name
//     ORDER BY u.name;
//   `);
//   return c.json(result.rows);
// });



userApp.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0].message }, 400);
    }

    const { name, email, password } = parsed.data;
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertedUser = await db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      });

    return c.json(insertedUser[0], 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});




userApp.get("/:id", async (c) => {
  const parsed = idParamSchema.safeParse(c.req.param());

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { id } = parsed.data;

  try {
    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (user.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(user[0]);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
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
    return c.json({ error: bodyParsed.error.issues[0].message }, 400);
  }

  const { id } = paramParsed.data;
  const { name, email } = bodyParsed.data;

  try {
    const result = await db
      .update(users)
      .set({ name, email })
      .where(eq(users.id, id))
      .returning({ id: users.id, name: users.name, email: users.email, createdAt: users.createdAt });
      

    if (result.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});


userApp.delete("/:id", async (c) => {
  const parsed = idParamSchema.safeParse(c.req.param());

  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0].message }, 400);
  }

  const { id } = parsed.data;

   const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

  if (result.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ message: "User deleted successfully" });
});



export default userApp;
