import { Hono } from "hono";
import bcrypt from "bcrypt";
import { db } from "../db.js";
import { users,addresses ,usersRelations,addressesRelations} from "../db/schema.js"; 
import type { AddressInsert } from "../db/schema.js";
import { eq ,isNull,sql} from "drizzle-orm"; 
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



userApp.post("/with-addresses", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createUserWithAddressesSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { errors: parsed.error.issues.map((issue) => issue.message) },
        400
      );
    }

    const { user, addresses: addressesToInsert } = parsed.data;

 
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const result = await db.transaction(async (tx) => {

      const [insertedUser] = await tx
        .insert(users)
        .values({
          name: user.name,
          email: user.email,
          password: hashedPassword,
        })
        .returning({
          id: users.id,
          name: users.name,
          email: users.email,
        });

      
      const addressesWithUserId :AddressInsert[]= addressesToInsert.map((addr) => ({
        userId: insertedUser.id,
        addressLine: addr.address_line,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postal_code,
        country: addr.country,
      }));

      await tx.insert(addresses).values(addressesWithUserId);

        const userWithAddresses = await tx.query.users.findFirst({
        where: eq(users.id, insertedUser.id),
        with: {
          addresses: true,
        },
      });

      return userWithAddresses!;

    });

    return c.json(result, 201);
  } catch (err: unknown) {
    
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      typeof (err as any).code === "string"
    ) {
      const code = (err as any).code;

      if (code === "23505") {
        return c.json({ error: "Duplicate entry: This email already exists." }, 409);
      }

      if (code === "23503") {
        return c.json({ error: "Foreign key violation: Invalid reference." }, 400);
      }
    }

    console.error("Transaction failed:", err);
    return c.json({ error: "Transaction failed, rolled back" }, 500);
  }
});








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




userApp.get("/address-count", async (c) => {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      addressCount: sql<number>`COUNT(${addresses.id})` ,
    })
    .from(users)
    .leftJoin(
      addresses,
      eq(users.id, addresses.userId)
    )
    .groupBy(users.id, users.name)
    .orderBy(users.name);

  return c.json(result);
});



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
