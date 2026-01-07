
import { z } from "zod"

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .nonempty("Name is required")
    .min(3, "Name must be at least 3 characters"),

  email: z.email("Invalid email address"),
  
  
 
   

  password: z
    .string()
    .nonempty("Password is required")
    .min(6, "Password must be at least 6 characters")
      .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[@$!%*?&]/, "Password must contain a special character"),
})

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("ID must be a positive number"),
});

/** UserId param schema (for addresses) */
export const userIdParamSchema = z.object({
  userId: z.coerce.number().int().positive("User ID must be a positive number"),
});
export const addressIdParamSchema = z.object({
  addressId: z.coerce.number().int().positive("Address ID must be a positive number"),
});