import { pgTable, text, real, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const orderSideEnum = pgEnum("order_side", ["buy", "sell"]);
export const orderTypeEnum = pgEnum("order_type", ["market", "limit", "stop_limit", "stop_market"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "filled", "cancelled", "rejected"]);

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  side: orderSideEnum("side").notNull(),
  type: orderTypeEnum("type").notNull(),
  quantity: real("quantity").notNull(),
  price: real("price"),
  stopPrice: real("stop_price"),
  status: orderStatusEnum("status").notNull().default("pending"),
  filledPrice: real("filled_price"),
  filledAt: timestamp("filled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  total: real("total"),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
