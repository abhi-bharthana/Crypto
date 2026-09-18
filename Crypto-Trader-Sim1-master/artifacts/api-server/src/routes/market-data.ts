import { Router, type IRouter } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";

const router: IRouter = Router();

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

interface OrderBookEntry {
  price: string;
  quantity: string;
}

interface MarketUpdate {
  type: "ticker" | "orderbook";
  symbol: string;
  ticker?: {
    c: string;
    p: string;
    P: string;
    h: string;
    l: string;
    v: string;
  };
  orderbook?: {
    bids: [string, string][];
    asks: [string, string][];
    lastUpdateId: number;
  };
}

const COIN_MAP: Record<string, string> = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  SHIBUSDT: "shiba-inu",
};

const priceCache: Record<string, PriceData> = {};
let lastFetchTime = 0;
const FETCH_INTERVAL = 3000;

async function fetchPrices(): Promise<void> {
  const now = Date.now();
  if (now - lastFetchTime < FETCH_INTERVAL) return;
  lastFetchTime = now;

  try {
    const ids = Object.values(COIN_MAP).join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_high_24h=true&include_low_24h=true`;

    const res = await fetch(url, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "CryptoTradingSimulator/1.0",
      },
    });

    if (!res.ok) return;

    const data = await res.json() as Record<string, any>;

    for (const [symbol, coinId] of Object.entries(COIN_MAP)) {
      const coinData = data[coinId];
      if (!coinData) continue;

      const prevPrice = priceCache[symbol]?.price;
      const currentPrice = coinData.usd as number;

      priceCache[symbol] = {
        symbol,
        price: currentPrice,
        change24h: coinData.usd_24h_change ?? 0,
        high24h: coinData.usd_24h_high ?? currentPrice * 1.05,
        low24h: coinData.usd_24h_low ?? currentPrice * 0.95,
        volume24h: coinData.usd_24h_vol ?? 0,
      };
    }
  } catch (err) {
    console.error("[Market Data] Fetch error:", err);
  }
}

function generateOrderBook(symbol: string): { bids: [string, string][]; asks: [string, string][] } {
  const priceData = priceCache[symbol];
  if (!priceData) {
    return { bids: [], asks: [] };
  }

  const basePrice = priceData.price;
  const isShib = symbol === "SHIBUSDT";
  const tickSize = isShib ? 0.00000001 : symbol === "ETHUSDT" ? 0.01 : 0.1;
  const spread = isShib ? basePrice * 0.001 : basePrice * 0.0002;

  const bids: [string, string][] = [];
  const asks: [string, string][] = [];

  for (let i = 0; i < 20; i++) {
    const bidPrice = basePrice - spread - (i * tickSize * (1 + Math.random() * 2));
    const askPrice = basePrice + spread + (i * tickSize * (1 + Math.random() * 2));

    const bidQty = isShib
      ? (Math.random() * 50000000 + 1000000).toFixed(0)
      : symbol === "ETHUSDT"
        ? (Math.random() * 20 + 0.1).toFixed(4)
        : (Math.random() * 2 + 0.001).toFixed(5);

    const askQty = isShib
      ? (Math.random() * 50000000 + 1000000).toFixed(0)
      : symbol === "ETHUSDT"
        ? (Math.random() * 20 + 0.1).toFixed(4)
        : (Math.random() * 2 + 0.001).toFixed(5);

    const priceDecimals = isShib ? 10 : symbol === "ETHUSDT" ? 2 : 1;
    bids.push([bidPrice.toFixed(priceDecimals), bidQty]);
    asks.push([askPrice.toFixed(priceDecimals), askQty]);
  }

  return { bids, asks };
}

const clients = new Set<WebSocket>();

async function broadcastMarketData() {
  if (clients.size === 0) return;

  await fetchPrices();

  for (const [symbol] of Object.entries(COIN_MAP)) {
    const priceData = priceCache[symbol];
    if (!priceData) continue;

    const { bids, asks } = generateOrderBook(symbol);
    const prevChange = priceData.change24h;
    const prevPrice = priceData.price;

    const update: MarketUpdate = {
      type: "ticker",
      symbol,
      ticker: {
        c: priceData.price.toString(),
        p: (priceData.price * (prevChange / 100)).toFixed(2),
        P: prevChange.toFixed(2),
        h: priceData.high24h.toString(),
        l: priceData.low24h.toString(),
        v: priceData.volume24h.toFixed(2),
      },
    };

    const obUpdate: MarketUpdate = {
      type: "orderbook",
      symbol,
      orderbook: {
        bids,
        asks,
        lastUpdateId: Date.now(),
      },
    };

    const tickerMsg = JSON.stringify(update);
    const obMsg = JSON.stringify(obUpdate);

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(tickerMsg);
        client.send(obMsg);
      }
    }
  }
}

let broadcastInterval: ReturnType<typeof setInterval> | null = null;

export function setupMarketDataProxy(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = request.url || "";
    if (url === "/api/ws/market") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    clients.add(ws);
    console.log(`[Market Data] Client connected. Total: ${clients.size}`);

    // Send initial data immediately
    fetchPrices().then(() => {
      for (const [symbol] of Object.entries(COIN_MAP)) {
        const priceData = priceCache[symbol];
        if (!priceData) return;

        const { bids, asks } = generateOrderBook(symbol);

        ws.send(JSON.stringify({
          type: "ticker",
          symbol,
          ticker: {
            c: priceData.price.toString(),
            p: (priceData.price * (priceData.change24h / 100)).toFixed(2),
            P: priceData.change24h.toFixed(2),
            h: priceData.high24h.toString(),
            l: priceData.low24h.toString(),
            v: priceData.volume24h.toFixed(2),
          },
        } as MarketUpdate));

        ws.send(JSON.stringify({
          type: "orderbook",
          symbol,
          orderbook: {
            bids,
            asks,
            lastUpdateId: Date.now(),
          },
        } as MarketUpdate));
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[Market Data] Client disconnected. Total: ${clients.size}`);
    });

    ws.on("error", () => {
      clients.delete(ws);
    });
  });

  // Start broadcasting every 3 seconds
  if (!broadcastInterval) {
    broadcastInterval = setInterval(broadcastMarketData, 3000);
  }
}

// REST endpoint for current prices (used by order form to get current market price)
router.get("/market/prices", async (_req, res) => {
  try {
    await fetchPrices();
    const prices: Record<string, any> = {};
    for (const [symbol, data] of Object.entries(priceCache)) {
      prices[symbol] = {
        price: data.price,
        change24h: data.change24h,
        high24h: data.high24h,
        low24h: data.low24h,
      };
    }
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: String(err) });
  }
});

export default router;
