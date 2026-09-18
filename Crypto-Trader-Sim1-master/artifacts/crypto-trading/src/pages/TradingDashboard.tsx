import React, { useState } from 'react';
import { TradingViewChart } from '@/components/TradingViewChart';
import { OrderBook } from '@/components/OrderBook';
import { OrderForm } from '@/components/OrderForm';
import { PortfolioSidebar } from '@/components/PortfolioSidebar';
import { RecentOrders } from '@/components/RecentOrders';
import { useBinanceWebSocket } from '@/hooks/use-binance-ws';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SHIBUSDT'];

export default function TradingDashboard() {
  const [symbol, setSymbol] = useState(SYMBOLS[0]);
  const { ticker } = useBinanceWebSocket(symbol);
  
  const priceChange = ticker ? parseFloat(ticker.P) : 0;
  const isPositive = priceChange >= 0;

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/30">
      {/* Dynamic Background generated from requirements.yaml */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none bg-cover bg-center bg-no-repeat mix-blend-screen"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-mesh.png)` }}
      />
      
      <div className="relative z-10 flex flex-col h-screen p-2 md:p-4 gap-4 max-w-[1920px] mx-auto">
        
        {/* Navbar Layer */}
        <header className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-2xl">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-white font-bold text-xl tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-gradient">NEXUS</span>
              <span className="text-white/30 font-light">TRADE</span>
            </div>
            
            <div className="h-6 w-[1px] bg-white/10 hidden md:block" />
            
            <Tabs value={symbol} onValueChange={setSymbol} className="w-auto">
              <TabsList className="bg-black/20 border border-white/5">
                {SYMBOLS.map(s => (
                  <TabsTrigger key={s} value={s} className="px-4 text-xs font-semibold tracking-wider">
                    {s.replace('USDT', '')}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-6">
            {ticker && (
              <motion.div 
                key={ticker.c}
                initial={{ opacity: 0.5, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-end gap-3"
              >
                <div className="flex flex-col items-end">
                  <span className="text-xs text-white/50 uppercase tracking-wider">Market Price</span>
                  <span className={`text-xl font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(parseFloat(ticker.c))}
                  </span>
                </div>
                <div className={`flex items-center text-sm font-medium px-2 py-1 rounded-md bg-black/20 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </div>
              </motion.div>
            )}
          </div>
        </header>

        {/* Main Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
          
          {/* Left: Sidebar */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-2 h-full">
            <PortfolioSidebar />
          </div>

          {/* Center: Chart & History */}
          <div className="col-span-1 lg:col-span-6 xl:col-span-7 flex flex-col gap-4 h-full min-h-0">
            <div className="flex-1 min-h-[400px]">
              <TradingViewChart symbol={symbol} />
            </div>
            <div className="h-64 shrink-0">
              <RecentOrders />
            </div>
          </div>

          {/* Right: OrderBook & Execution */}
          <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 h-full min-h-0">
            <div className="h-1/2 min-h-[300px]">
              <OrderBook symbol={symbol} />
            </div>
            <div className="h-1/2 min-h-[350px]">
              <OrderForm symbol={symbol} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
