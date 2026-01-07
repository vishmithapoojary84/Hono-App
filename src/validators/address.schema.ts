import { z } from "zod";

export const createAddressSchema = z.object({
  address_line: z
    .string()
    .min(3, "Address line must be at least 3 characters")
    .max(255, "Address line must be at most 255 characters")
    .trim(),

  city: z
    .string()
    .min(2, "City must be at least 2 characters")
    .max(100, "City must be at most 100 characters")
    .trim(),

  state: z
    .string()
    .min(2, "State must be at least 2 characters")
    .max(100, "State must be at most 100 characters")
    .trim(),

  postal_code: z
    .string()
     .regex(/^\d{6}$/, "Postal code must be a valid 6-digit PIN code")
    .trim(),

  country: z
    .string()
    .min(2, "Country must be at least 2 characters")
    .max(100, "Country must be at most 100 characters")
    .trim(),
});
