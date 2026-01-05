import { pool } from "./db.js"


async function test() {
  try {
    const res = await pool.query("SELECT NOW()")
    console.log("DB Connected:", res.rows[0])
  } catch (e) {
    console.error("DB connection error:", e)
  }
}

test()
