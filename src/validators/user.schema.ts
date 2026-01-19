import { z } from "zod";

export const createUserSchema = z.object({
  name: z
    .string({ message: "Name must be a string" })
    .trim()
    .min(3, { message: "Name must be at least 3 characters" })
    .nonempty({ message: "Name is required" }), 

  email: z
  .string({ message: "Email must be a string" })
  .trim()
  .min(1, { message: "Email is required" }) 
  .pipe(z.email({ message: "Invalid email address" })),

  password: z
    .string({ message: "Password must be a string" })
    .min(6, { message: "Password must be at least 6 characters" })
    .regex(/[A-Za-z]/, { message: "Password must contain at least one letter" })
    .regex(/[0-9]/, { message: "Password must contain at least one number" })
    .regex(/[@$!%*?&]/, { message: "Password must contain at least one special character (@$!%*?&)" }),
});



export const idParamSchema = z.object({
  id: z.coerce.number().int().positive({ message: "ID must be a positive number" }),
});

export const userIdParamSchema = z.object({
  userId: z.coerce.number().int().positive({ message: "User ID must be a positive number" }),
});

export const addressIdParamSchema = z.object({
  addressId: z.coerce.number().int().positive({ message: "Address ID must be a positive number" }),
});
