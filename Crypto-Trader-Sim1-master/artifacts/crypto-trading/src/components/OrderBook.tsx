import React from 'react';
import { GlassCard } from './ui/glass-card';
import { useBinanceWebSocket, OrderBookEntry } from '@/hooks/use-binance-ws';
import { formatCrypto, getPriceDecimals } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OrderBookProps {
  symbol: string;
}

export const OrderBook: React.FC<OrderBookProps> = ({ symbol }) => {
  const { orderBook, ticker } = useBinanceWebSocket(symbol);

  // We only show top 15 of each to keep it clean
  const asks = orderBook.asks.slice(0, 15).reverse(); // Asks should go down towards current price
  const bids = orderBook.bids.slice(0, 15); // Bids should go down away from current price

  const currentPrice = ticker ? parseFloat(ticker.c) : 0;
  const decimals = getPriceDecimals(currentPrice);

  // Calculate totals and max for depth bars
  let askTotal = 0;
  const asksWithTotal = asks.map(([price, qty]) => {
    askTotal += parseFloat(qty);
    return { price, qty, total: askTotal };
  });

  let bidTotal = 0;
  const bidsWithTotal = bids.map(([price, qty]) => {
    bidTotal += parseFloat(qty);
    return { price, qty, total: bidTotal };
  });

  const maxTotal = Math.max(askTotal, bidTotal) || 1;

  const renderRow = (item: { price: string, qty: string, total: number }, type: 'ask' | 'bid', index: number) => {
    const depthPct = (item.total / maxTotal) * 100;
    const priceNum = parseFloat(item.price);
    const qtyNum = parseFloat(item.qty);

    return (
      <div key={`${type}-${index}-${item.price}`} className="relative flex justify-between items-center py-1 px-2 text-xs font-mono group hover:bg-white/5 cursor-pointer">
        <div 
          className={`absolute right-0 top-0 bottom-0 opacity-20 transition-all duration-300 ${type === 'ask' ? 'bg-rose-500' : 'bg-emerald-500'}`}
          style={{ width: `${depthPct}%` }}
        />
        <span className={`relative z-10 ${type === 'ask' ? 'text-rose-400' : 'text-emerald-400'}`}>
          {formatCrypto(priceNum, decimals)}
        </span>
        <span className="relative z-10 text-white/70">{formatCrypto(qtyNum, 4)}</span>
        <span className="relative z-10 text-white/40">{formatCrypto(item.total, 4)}</span>
      </div>
    );
  };

  return (
    <GlassCard className="flex flex-col h-full overflow-hidden">
      <div className="p-3 border-b border-white/5 flex justify-between text-xs font-medium text-white/50">
        <span>Price(USDT)</span>
        <span>Amount</span>
        <span>Total</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col text-sm">
        {/* Asks (Sell Orders) */}
        <div className="flex-1 overflow-hidden flex flex-col justify-end">
          {asksWithTotal.map((ask, i) => renderRow(ask, 'ask', i))}
        </div>

        {/* Current Price Divider */}
        <div className="py-2 px-3 border-y border-white/5 bg-black/20 flex items-center justify-center">
          <span className={`text-lg font-bold ${
            ticker ? (parseFloat(ticker.p) >= 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-white'
          }`}>
            {currentPrice > 0 ? formatCrypto(currentPrice, decimals) : '---'}
          </span>
          {ticker && (
             <span className="text-xs ml-2 text-white/50">${currentPrice}</span>
          )}
        </div>

        {/* Bids (Buy Orders) */}
        <div className="flex-1 overflow-hidden">
          {bidsWithTotal.map((bid, i) => renderRow(bid, 'bid', i))}
        </div>
      </div>
    </GlassCard>
  );
};
