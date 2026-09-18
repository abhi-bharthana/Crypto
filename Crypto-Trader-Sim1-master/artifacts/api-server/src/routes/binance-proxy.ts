import { Router, type IRouter } from "express";
import { WebSocket, WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";

const router: IRouter = Router();

const BINANCE_WS_BASE = "wss://stream.binance.com:9443";

export function setupBinanceProxy(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket: any, head: Buffer) => {
    const url = request.url || "";
    if (url.startsWith("/api/ws/binance")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (clientWs: WebSocket, request: IncomingMessage) => {
    const url = request.url || "";
    const streamParam = url.split("/api/ws/binance/")[1];

    if (!streamParam) {
      clientWs.close(1008, "Missing stream parameter");
      return;
    }

    const binanceUrl = `${BINANCE_WS_BASE}/stream?streams=${streamParam}`;
    let binanceWs: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    let isClientConnected = true;

    function connectToBinance() {
      if (!isClientConnected) return;

      binanceWs = new WebSocket(binanceUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; CryptoTrader/1.0)",
        },
      });

      binanceWs.on("open", () => {
        console.log(`[Binance Proxy] Connected to ${binanceUrl}`);
      });

      binanceWs.on("message", (data: Buffer) => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data.toString());
        }
      });

      binanceWs.on("error", (err) => {
        console.error(`[Binance Proxy] Error:`, err.message);
      });

      binanceWs.on("close", (code, reason) => {
        console.log(`[Binance Proxy] Disconnected (${code}). Reconnecting in 2s...`);
        if (isClientConnected) {
          reconnectTimeout = setTimeout(connectToBinance, 2000);
        }
      });
    }

    connectToBinance();

    clientWs.on("close", () => {
      isClientConnected = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (binanceWs) {
        binanceWs.close();
        binanceWs = null;
      }
    });

    clientWs.on("error", () => {
      isClientConnected = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (binanceWs) {
        binanceWs.close();
        binanceWs = null;
      }
    });
  });
}

export default router;
