import { useState, useEffect, useRef } from 'react';

export type OrderBookEntry = [string, string]; // [price, quantity]

export interface OrderBook {
  lastUpdateId: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

export interface TickerData {
  c: string; // Last price
  p: string; // Price change
  P: string; // Price change percent
  v: string; // Total traded base asset volume
  h: string; // High price
  l: string; // Low price
}

function getMarketWsUrl(): string {
  const isSecure = window.location.protocol === 'https:';
  const wsProtocol = isSecure ? 'wss' : 'ws';
  const host = window.location.host;
  return `${wsProtocol}://${host}/api/ws/market`;
}

// Shared WebSocket connection singleton
let sharedWs: WebSocket | null = null;
const tickerListeners = new Map<string, Set<(data: TickerData) => void>>();
const orderBookListeners = new Map<string, Set<(data: any) => void>>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let wsConnected = false;

function ensureConnection() {
  if (sharedWs && (sharedWs.readyState === WebSocket.OPEN || sharedWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const wsUrl = getMarketWsUrl();
  const ws = new WebSocket(wsUrl);
  sharedWs = ws;

  ws.onopen = () => {
    wsConnected = true;
    console.log('[Market WS] Connected');
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      const { type, symbol, ticker, orderbook } = msg;

      if (type === 'ticker' && ticker) {
        const listeners = tickerListeners.get(symbol);
        listeners?.forEach(fn => fn(ticker));
      } else if (type === 'orderbook' && orderbook) {
        const listeners = orderBookListeners.get(symbol);
        listeners?.forEach(fn => fn(orderbook));
      }
    } catch (e) {
      // ignore parse errors
    }
  };

  ws.onclose = () => {
    wsConnected = false;
    console.log('[Market WS] Disconnected. Reconnecting in 3s...');
    reconnectTimer = setTimeout(ensureConnection, 3000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

export function useBinanceWebSocket(symbol: string) {
  const [orderBook, setOrderBook] = useState<OrderBook>({ lastUpdateId: 0, bids: [], asks: [] });
  const [ticker, setTicker] = useState<TickerData | null>(null);

  useEffect(() => {
    if (!symbol) return;

    // Register ticker listener
    if (!tickerListeners.has(symbol)) {
      tickerListeners.set(symbol, new Set());
    }
    if (!orderBookListeners.has(symbol)) {
      orderBookListeners.set(symbol, new Set());
    }

    const handleTicker = (data: TickerData) => setTicker(data);
    const handleOrderBook = (data: any) => {
      setOrderBook({
        lastUpdateId: data.lastUpdateId,
        bids: data.bids || [],
        asks: data.asks || [],
      });
    };

    tickerListeners.get(symbol)!.add(handleTicker);
    orderBookListeners.get(symbol)!.add(handleOrderBook);

    ensureConnection();

    return () => {
      tickerListeners.get(symbol)?.delete(handleTicker);
      orderBookListeners.get(symbol)?.delete(handleOrderBook);
    };
  }, [symbol]);

  return { orderBook, ticker };
}
