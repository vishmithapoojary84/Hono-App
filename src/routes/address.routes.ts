import { Hono } from "hono";
import { db } from "../db.js";
import { userIdParamSchema, addressIdParamSchema } from "../validators/user.schema.js";
import { createAddressSchema } from "../validators/address.schema.js";
import { eq ,and} from "drizzle-orm";
import { users, addresses } from "../db/schema.js";
const addressApp = new Hono();



addressApp.post("/", async (c) => {
  try {
    
    const userIdParsed = userIdParamSchema.safeParse({
      userId: c.req.param("userId"),
    });

    if (!userIdParsed.success) {
      return c.json(
        { error: userIdParsed.error.issues[0].message },
        400
      );
    }

    const { userId } = userIdParsed.data;

    
    const body = await c.req.json();
    const validatedAddress = createAddressSchema.safeParse(body);

    if (!validatedAddress.success) {
      return c.json(
        { error: validatedAddress.error.issues[0].message },
        400
      );
    }

    
    const userCheck = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userCheck.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

  
    const { address_line, city, state, postal_code, country } =
      validatedAddress.data;

    const result = await db
      .insert(addresses)
      .values({
        userId,
        addressLine: address_line,
        city,
        state,
        postalCode: postal_code,
        country,
      })
      .returning();

    return c.json(result[0], 201);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});



addressApp.get("/:userId", async (c) => {
  try {
    
    const userIdParsed = userIdParamSchema.safeParse({
      userId: c.req.param("userId"),
    });

    if (!userIdParsed.success) {
      return c.json(
        { error: userIdParsed.error.issues[0].message },
        400
      );
    }

    const { userId } = userIdParsed.data;


    const userCheck = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userCheck.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }

    const result = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId))
      .orderBy(addresses.id);

    return c.json(result);
  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});



// addressApp.get("/addres", async (c) => {
//   try {
//     const result = await db
//     .select()
//     .from(addresses)
//     .orderBy(addresses.id);
//     return c.json(result);
//   } catch (err) {
//     console.error(err);
//     return c.json({ error: "Internal Server Error" }, 500);
//   }
// });




addressApp.patch("/:addressId", async (c) => {
  try {
    const userId = Number(c.req.param("userId"));
    const addressId = Number(c.req.param("addressId"));

    if (isNaN(userId) || isNaN(addressId)) {
      return c.json({ error: "Invalid IDs" }, 400);
    }

    const body = await c.req.json();

    
    const parsed = createAddressSchema.partial().safeParse(body);
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0].message }, 400);
    }

    const result = await db
      .update(addresses)
      .set(parsed.data) 
      .where(
        and(
          eq(addresses.id, addressId),
          eq(addresses.userId, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      return c.json({ error: "Address not found for this user" }, 404);
    }

    return c.json(result[0]);

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

    
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userExists.length === 0) {
      return c.json({ error: "User not found" }, 404);
    }


    const deleted = await db
      .delete(addresses)
      .where(
        and(
          eq(addresses.id, addressId),
          eq(addresses.userId, userId)
        )
      )
      .returning();

    if (deleted.length === 0) {
      return c.json(
        { error: "Address not found for this user" },
        404
      );
    }

    
    return c.json({
      message: "Address deleted successfully",
      deletedAddress: deleted[0],
    });

  } catch (err) {
    console.error(err);
    return c.json({ error: "Internal Server Error" }, 500);
  }
});




export default addressApp;
