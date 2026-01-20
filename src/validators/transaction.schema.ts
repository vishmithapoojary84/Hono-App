import { z } from "zod";
import { createUserSchema } from "./user.schema.js";
import { createAddressSchema } from "./address.schema.js";

export const createUserWithAddressesSchema = z.object({
  user: createUserSchema,                    
  addresses: z.array(createAddressSchema).min(1, "At least one address is required"), 
});
