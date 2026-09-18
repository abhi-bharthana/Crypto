import React from 'react';
import { GlassCard } from './ui/glass-card';
import { useGetOrders, useCancelOrder } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getGetOrdersQueryKey, getGetPortfolioQueryKey } from '@workspace/api-client-react';
import { formatCurrency, formatCrypto } from '@/lib/utils';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';

export const RecentOrders: React.FC = () => {
  const { data: orders, isLoading } = useGetOrders();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const cancelMut = useCancelOrder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Order Cancelled", description: "The pending order was successfully cancelled." });
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    }
  });

  if (isLoading) {
    return <GlassCard className="h-full animate-pulse opacity-50" />;
  }

  const handleCancel = (id: string) => {
    cancelMut.mutate({ orderId: id });
  };

  return (
    <GlassCard className="h-full flex flex-col">
      <div className="p-4 border-b border-white/5">
        <h3 className="font-medium text-white">Recent Orders</h3>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="text-xs text-white/50 uppercase bg-black/20 sticky top-0 backdrop-blur-xl z-10">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Symbol</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Side</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {!orders?.length ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/30 italic">No orders found</td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-white/70">
                    {format(new Date(order.createdAt), 'MMM dd, HH:mm:ss')}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{order.symbol}</td>
                  <td className="px-4 py-3 text-white/70 capitalize">{order.type.replace('_', ' ')}</td>
                  <td className={`px-4 py-3 font-medium ${order.side === 'buy' ? 'text-emerald-400' : 'text-rose-400'} uppercase`}>
                    {order.side}
                  </td>
                  <td className="px-4 py-3 font-mono text-white/90">
                    {order.price ? formatCurrency(order.price) : 'Market'}
                  </td>
                  <td className="px-4 py-3 font-mono text-white/90">
                    {formatCrypto(order.quantity)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider
                      ${order.status === 'filled' ? 'bg-emerald-500/20 text-emerald-400' : 
                        order.status === 'pending' ? 'bg-blue-500/20 text-blue-400' : 
                        'bg-white/10 text-white/50'}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {order.status === 'pending' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        onClick={() => handleCancel(order.id)}
                        disabled={cancelMut.isPending}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
};
