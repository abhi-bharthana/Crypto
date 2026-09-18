import React from 'react';
import { GlassCard } from './ui/glass-card';

interface TradingViewChartProps {
  symbol: string;
}

export const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol }) => {
  // Format symbol for TradingView (e.g., BTCUSDT -> BINANCE:BTCUSDT)
  const tvSymbol = `BINANCE:${symbol.toUpperCase()}`;

  return (
    <GlassCard className="w-full h-full flex flex-col overflow-hidden min-h-[400px]">
      <div className="flex-1 relative w-full h-full">
        <iframe
          id="tradingview_chart"
          src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${tvSymbol}&interval=15&hidesidetoolbar=0&symboledit=0&saveimage=0&toolbarbg=1a1d24&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&backgroundColor=%230b0e14`}
          className="absolute top-0 left-0 w-full h-full border-0"
          title="TradingView Chart"
          allowFullScreen
        />
      </div>
    </GlassCard>
  );
};
