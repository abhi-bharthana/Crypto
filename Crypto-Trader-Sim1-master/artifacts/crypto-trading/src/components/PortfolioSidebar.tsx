import React from 'react';
import { GlassCard } from './ui/glass-card';
import { useGetPortfolio, useResetPortfolio } from '@workspace/api-client-react';
import { formatCurrency } from '@/lib/utils';
import { Wallet, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';
import { Button } from './ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { getGetOrdersQueryKey, getGetPortfolioQueryKey } from '@workspace/api-client-react';

export const PortfolioSidebar: React.FC = () => {
  const { data: portfolio, isLoading } = useGetPortfolio();
  const queryClient = useQueryClient();
  
  const resetMut = useResetPortfolio({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
      }
    }
  });

  if (isLoading || !portfolio) {
    return <GlassCard className="h-full animate-pulse opacity-50" />;
  }

  const isProfitable = portfolio.pnl >= 0;

  return (
    <GlassCard className="h-full flex flex-col relative overflow-hidden">
      {/* Decorative gradient blob behind the stats */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

      <div className="p-6 border-b border-white/5">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Portfolio
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => resetMut.mutate()}
            disabled={resetMut.isPending}
            title="Reset Simulator"
          >
            <RefreshCcw className={`w-4 h-4 text-white/50 ${resetMut.isPending ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-white/50 uppercase tracking-wider">Estimated Balance</p>
          <h1 className="text-3xl font-mono font-bold text-white tracking-tight">
            {formatCurrency(portfolio.totalValue)}
          </h1>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-md bg-black/20 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {isProfitable ? '+' : ''}{formatCurrency(portfolio.pnl)}
          </span>
          <span className={`text-sm ${isProfitable ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
            ({isProfitable ? '+' : ''}{portfolio.pnlPercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <h3 className="text-sm font-medium text-white/50 mb-4 uppercase tracking-wider">Assets</h3>
        
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                $
              </div>
              <div>
                <p className="font-medium text-white">USDT</p>
                <p className="text-xs text-white/50">Tether</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-white">{formatCurrency(portfolio.usdBalance)}</p>
            </div>
          </div>

          {portfolio.holdings.map((holding) => (
            <div key={holding.symbol} className="flex justify-between items-center p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.05] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  {holding.symbol.replace('USDT', '').slice(0, 3)}
                </div>
                <div>
                  <p className="font-medium text-white">{holding.symbol.replace('USDT', '')}</p>
                  <p className="text-xs text-white/50">{holding.quantity} tokens</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-white">{formatCurrency(holding.currentValue)}</p>
                <p className={`text-xs ${holding.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {holding.pnl >= 0 ? '+' : ''}{formatCurrency(holding.pnl)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};
