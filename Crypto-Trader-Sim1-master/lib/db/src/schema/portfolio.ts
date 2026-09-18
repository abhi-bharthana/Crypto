import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portfolioTable = pgTable("portfolio", {
  id: text("id").primaryKey().default("default"),
  usdBalance: real("usd_balance").notNull().default(100000),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const holdingsTable = pgTable("holdings", {
  id: text("id").primaryKey(),
  symbol: text("symbol").notNull(),
  quantity: real("quantity").notNull().default(0),
  averageCost: real("average_cost").notNull().default(0),
});

export const insertPortfolioSchema = createInsertSchema(portfolioTable);
export const insertHoldingSchema = createInsertSchema(holdingsTable).omit({ id: true });
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolioTable.$inferSelect;
export type Holding = typeof holdingsTable.$inferSelect;
