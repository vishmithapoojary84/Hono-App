import { pgTable, serial, integer, varchar, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),                    
  name: varchar("name", { length: 255 }).notNull(), 
  email: varchar("email", { length: 255 }).notNull().unique(), 
  password: varchar("password", { length: 255 }).notNull(), 
  createdAt: timestamp("created_at").defaultNow(),  
});

export const addresses = pgTable("addresses", {
  id: serial("id").primaryKey(),                     
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), 
  addressLine: varchar("address_line", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  postalCode: varchar("postal_code", { length: 20 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
