import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, portfolioTable, holdingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod/v4";


const router: IRouter = Router();

const INITIAL_BALANCE = 100000;

async function ensurePortfolio() {
  const existing = await db.select().from(portfolioTable).where(eq(portfolioTable.id, "default")).limit(1);
  if (existing.length === 0) {
    await db.insert(portfolioTable).values({ id: "default", usdBalance: INITIAL_BALANCE });
  }
  return existing[0] ?? { id: "default", usdBalance: INITIAL_BALANCE, updatedAt: new Date() };
}

async function getHolding(symbol: string) {
  const result = await db.select().from(holdingsTable).where(eq(holdingsTable.symbol, symbol)).limit(1);
  return result[0] ?? null;
}

router.get("/portfolio", async (_req, res) => {
  try {
    const portfolio = await ensurePortfolio();
    const holdings = await db.select().from(holdingsTable);

    const holdingData = holdings
      .filter(h => h.quantity > 0)
      .map(h => ({
        symbol: h.symbol,
        quantity: h.quantity,
        averageCost: h.averageCost,
        currentValue: 0,
        pnl: 0,
      }));

    const totalValue = portfolio.usdBalance;
    const pnl = totalValue - INITIAL_BALANCE;
    const pnlPercent = (pnl / INITIAL_BALANCE) * 100;

    res.json({
      usdBalance: portfolio.usdBalance,
      holdings: holdingData,
      totalValue,
      pnl,
      pnlPercent,
    });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

const placeOrderSchema = z.object({
  symbol: z.enum(["BTCUSDT", "ETHUSDT", "SHIBUSDT"]),
  side: z.enum(["buy", "sell"]),
  type: z.enum(["market", "limit", "stop_limit", "stop_market"]),
  quantity: z.number().positive(),
  price: z.number().positive().optional().nullable(),
  stopPrice: z.number().positive().optional().nullable(),
  marketPrice: z.number().positive(),
});

router.post("/orders", async (req, res) => {
  try {
    const parsed = placeOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "validation_error", message: "Invalid order data" });
    }

    const { symbol, side, type, quantity, price, stopPrice, marketPrice } = parsed.data;
    const portfolio = await ensurePortfolio();

    const executionPrice = type === "market" || type === "stop_market" ? marketPrice : (price ?? marketPrice);
    const total = quantity * executionPrice;

    const isMarketOrder = type === "market";
    const isStopMarket = type === "stop_market" && stopPrice && marketPrice <= (stopPrice || 0);

    if (side === "buy") {
      if (portfolio.usdBalance < total) {
        return res.status(400).json({ error: "insufficient_balance", message: "Insufficient USD balance" });
      }

      const orderId = randomUUID();
      const now = new Date();

      if (isMarketOrder) {
        await db.update(portfolioTable)
          .set({ usdBalance: portfolio.usdBalance - total, updatedAt: now })
          .where(eq(portfolioTable.id, "default"));

        const existing = await getHolding(symbol);
        if (existing) {
          const newQty = existing.quantity + quantity;
          const newAvgCost = ((existing.quantity * existing.averageCost) + total) / newQty;
          await db.update(holdingsTable)
            .set({ quantity: newQty, averageCost: newAvgCost })
            .where(eq(holdingsTable.symbol, symbol));
        } else {
          await db.insert(holdingsTable).values({
            id: randomUUID(),
            symbol,
            quantity,
            averageCost: executionPrice,
          });
        }

        const order = await db.insert(ordersTable).values({
          id: orderId,
          symbol,
          side: "buy",
          type: type as any,
          quantity,
          price: price ?? null,
          stopPrice: stopPrice ?? null,
          status: "filled",
          filledPrice: executionPrice,
          filledAt: now,
          total,
        }).returning();

        return res.status(201).json(formatOrder(order[0]));
      } else {
        const order = await db.insert(ordersTable).values({
          id: orderId,
          symbol,
          side: "buy",
          type: type as any,
          quantity,
          price: price ?? null,
          stopPrice: stopPrice ?? null,
          status: "pending",
          filledPrice: null,
          filledAt: null,
          total,
        }).returning();

        return res.status(201).json(formatOrder(order[0]));
      }
    } else {
      const holding = await getHolding(symbol);
      if (!holding || holding.quantity < quantity) {
        return res.status(400).json({ error: "insufficient_holdings", message: "Insufficient holdings to sell" });
      }

      const orderId = randomUUID();
      const now = new Date();

      if (isMarketOrder) {
        const newQty = holding.quantity - quantity;
        await db.update(holdingsTable)
          .set({ quantity: newQty })
          .where(eq(holdingsTable.symbol, symbol));

        await db.update(portfolioTable)
          .set({ usdBalance: portfolio.usdBalance + total, updatedAt: now })
          .where(eq(portfolioTable.id, "default"));

        const order = await db.insert(ordersTable).values({
          id: orderId,
          symbol,
          side: "sell",
          type: type as any,
          quantity,
          price: price ?? null,
          stopPrice: stopPrice ?? null,
          status: "filled",
          filledPrice: executionPrice,
          filledAt: now,
          total,
        }).returning();

        return res.status(201).json(formatOrder(order[0]));
      } else {
        const order = await db.insert(ordersTable).values({
          id: orderId,
          symbol,
          side: "sell",
          type: type as any,
          quantity,
          price: price ?? null,
          stopPrice: stopPrice ?? null,
          status: "pending",
          filledPrice: null,
          filledAt: null,
          total,
        }).returning();

        return res.status(201).json(formatOrder(order[0]));
      }
    }
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.get("/orders", async (_req, res) => {
  try {
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(50);
    res.json(orders.map(formatOrder));
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.delete("/orders/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const existing = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);

    if (!existing[0]) {
      return res.status(404).json({ error: "not_found", message: "Order not found" });
    }

    if (existing[0].status !== "pending") {
      return res.status(400).json({ error: "invalid_state", message: "Only pending orders can be cancelled" });
    }

    const updated = await db.update(ordersTable)
      .set({ status: "cancelled" })
      .where(eq(ordersTable.id, orderId))
      .returning();

    res.json(formatOrder(updated[0]));
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

router.post("/portfolio/reset", async (_req, res) => {
  try {
    const now = new Date();
    await db.update(portfolioTable)
      .set({ usdBalance: INITIAL_BALANCE, updatedAt: now })
      .where(eq(portfolioTable.id, "default"));

    await db.delete(holdingsTable);
    await db.update(ordersTable).set({ status: "cancelled" });

    res.json({
      usdBalance: INITIAL_BALANCE,
      holdings: [],
      totalValue: INITIAL_BALANCE,
      pnl: 0,
      pnlPercent: 0,
    });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

function formatOrder(order: any) {
  return {
    id: order.id,
    symbol: order.symbol,
    side: order.side,
    type: order.type,
    quantity: order.quantity,
    price: order.price ?? null,
    stopPrice: order.stopPrice ?? null,
    status: order.status,
    filledPrice: order.filledPrice ?? null,
    filledAt: order.filledAt ? order.filledAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    total: order.total ?? null,
  };
}

export default router;
