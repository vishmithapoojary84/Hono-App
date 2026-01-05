
import { z } from "zod"

export const createUserSchema = z.object({
  name: z
    .string()
    .nonempty("Name is required")
    .min(3, "Name must be at least 3 characters"),

  email: z
    .string()
    .nonempty("Email is required")
    .email("Invalid email format"),

  password: z
    .string()
    .nonempty("Password is required")
    .min(6, "Password must be at least 6 characters"),
})
