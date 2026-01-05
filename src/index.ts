import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { pool } from "./db.js"
import bcrypt from "bcrypt"
import { createUserSchema } from "./validators/user.schema.js"
const app = new Hono()

app.get("/", (c) => {
  return c.text("Hello Hono")
})


app.post("/users", async (c) => {
  try {
    const body = await c.req.json()

  
    const validated = createUserSchema.safeParse(body)

    if (!validated.success) {
         
      return c.json(
        {
          
          message: "Validation error",
          errors: validated.error.flatten().fieldErrors,
         
        },
        400
      )
    }

    const { name, email, password } = validated.data


    const hashedPassword = await bcrypt.hash(password, 10)

    
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, hashedPassword]
    )

    return c.json(result.rows[0], 201)

  } catch (error) {
    return c.json({ message: "Internal server error" }, 500)
  }
})




app.get("/users", async (c) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users"
    )
    return c.json(result.rows)
  } catch (error) {
    return c.json({ error: "Failed to fetch users" }, 500)
  }
})
app.get("/users/:id", async (c) => {
  try {
    const id = c.req.param("id") 
    const result = await pool.query(
      "SELECT id, name, email, created_at FROM users WHERE id = $1",
      [id]
    )
    
    if (result.rows.length === 0) {

      return c.json({ error: "User not found" }, 404)
    }

    return c.json(result.rows[0])
  } catch (error) {
    return c.json({ error: "Failed to fetch user" }, 500)
  }
})

app.put("/users/:id", async (c) => {
  try {
    const id = c.req.param("id")
    const { name, email } = await c.req.json()

    if (!name || !email) {
      return c.json({ error: "Name and email are required" }, 400)
    }

    const result = await pool.query(
      "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, created_at",
      [name, email, id]
    )

    if (result.rows.length === 0) {
      return c.json({ error: "User not found" }, 404)
    }

    return c.json(result.rows[0])
  } catch (error) {
    return c.json({ error: "Failed to update user" }, 500)
  }
})
app.delete("/users/:id", async (c) => {
  try {
    const id = c.req.param("id")

    const result = await pool.query(
      "DELETE FROM users WHERE id = $1 RETURNING id"
    , [id])

    if (result.rows.length === 0) {
      return c.json({ error: "User not found" }, 404)
    }

    return c.json({ message: `User with ${id} deleted successfully` })
  } catch (error) {
    return c.json({ error: "Failed to delete user" }, 500)
  }
})


serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server running on http://localhost:${info.port}`)
  }
)
