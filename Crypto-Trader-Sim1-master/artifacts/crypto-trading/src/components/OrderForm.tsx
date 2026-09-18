import React, { useEffect } from 'react';
import { GlassCard } from './ui/glass-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePlaceOrder, PlaceOrderRequestSymbol, PlaceOrderRequestSide, PlaceOrderRequestType } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { getGetOrdersQueryKey, getGetPortfolioQueryKey } from '@workspace/api-client-react';
import { useBinanceWebSocket } from '@/hooks/use-binance-ws';
import { formatCurrency } from '@/lib/utils';
import { Coins, DollarSign, Target, Activity } from 'lucide-react';

interface OrderFormProps {
  symbol: string;
}

const orderSchema = z.object({
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop_limit', 'stop_market']),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  price: z.coerce.number().positive().optional().nullable(),
  stopPrice: z.coerce.number().positive().optional().nullable(),
}).superRefine((data, ctx) => {
  if ((data.type === 'limit' || data.type === 'stop_limit') && !data.price) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Price required", path: ['price'] });
  }
  if ((data.type === 'stop_limit' || data.type === 'stop_market') && !data.stopPrice) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Stop price required", path: ['stopPrice'] });
  }
});

type OrderFormData = z.infer<typeof orderSchema>;

export const OrderForm: React.FC<OrderFormProps> = ({ symbol }) => {
  const { ticker } = useBinanceWebSocket(symbol);
  const currentPrice = ticker ? parseFloat(ticker.c) : 0;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const placeOrderMut = usePlaceOrder({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Order Placed",
          description: "Your order has been submitted successfully.",
        });
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPortfolioQueryKey() });
        form.reset({ ...form.getValues(), quantity: 0 }); // reset quantity
      },
      onError: (err: any) => {
        toast({
          title: "Order Failed",
          description: err.message || "Failed to place order",
          variant: "destructive"
        });
      }
    }
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      side: 'buy',
      type: 'limit',
      quantity: 0,
      price: currentPrice || 0,
    }
  });

  const side = form.watch('side');
  const type = form.watch('type');
  const qty = form.watch('quantity');
  const price = form.watch('price');

  // Auto-fill limit price when clicking market price (if form price is 0)
  useEffect(() => {
    if (currentPrice > 0 && form.getValues('price') === 0 && type !== 'market') {
      form.setValue('price', currentPrice);
    }
  }, [currentPrice, type, form]);

  const onSubmit = (data: OrderFormData) => {
    if (currentPrice === 0) {
      toast({ title: "Error", description: "Waiting for market price...", variant: "destructive" });
      return;
    }

    placeOrderMut.mutate({
      data: {
        symbol: symbol as PlaceOrderRequestSymbol,
        side: data.side as PlaceOrderRequestSide,
        type: data.type as PlaceOrderRequestType,
        quantity: data.quantity,
        price: data.price,
        stopPrice: data.stopPrice,
        marketPrice: currentPrice,
      }
    });
  };

  const estimatedTotal = type === 'market' || type === 'stop_market' 
    ? (qty || 0) * currentPrice 
    : (qty || 0) * (price || 0);

  return (
    <GlassCard className="p-4 h-full flex flex-col">
      <Tabs defaultValue="buy" onValueChange={(v) => form.setValue('side', v as 'buy'|'sell')} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy" className="data-[state=active]:text-emerald-400">Buy</TabsTrigger>
          <TabsTrigger value="sell" className="data-[state=active]:text-rose-400">Sell</TabsTrigger>
        </TabsList>
      </Tabs>

      <Tabs defaultValue="limit" onValueChange={(v) => form.setValue('type', v as any)} className="mb-4">
        <TabsList className="grid w-full grid-cols-4 text-xs">
          <TabsTrigger value="limit">Limit</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="stop_limit">Stop Limit</TabsTrigger>
          <TabsTrigger value="stop_market">Stop Mkt</TabsTrigger>
        </TabsList>
      </Tabs>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col space-y-4">
        
        {(type === 'stop_limit' || type === 'stop_market') && (
          <div className="space-y-1">
            <label className="text-xs text-white/60">Stop Price</label>
            <Input 
              type="number" 
              step="any"
              icon={<Target className="w-4 h-4" />}
              {...form.register('stopPrice')} 
              placeholder="Stop Price"
            />
            {form.formState.errors.stopPrice && <span className="text-xs text-rose-500">{form.formState.errors.stopPrice.message}</span>}
          </div>
        )}

        {(type === 'limit' || type === 'stop_limit') && (
          <div className="space-y-1">
            <label className="text-xs text-white/60">Price</label>
            <Input 
              type="number" 
              step="any"
              icon={<DollarSign className="w-4 h-4" />}
              {...form.register('price')} 
              placeholder="Order Price"
            />
            {form.formState.errors.price && <span className="text-xs text-rose-500">{form.formState.errors.price.message}</span>}
          </div>
        )}

        {type === 'market' && (
          <div className="py-2 px-3 bg-black/20 border border-white/5 rounded-lg flex items-center justify-between">
            <span className="text-sm text-white/60">Price</span>
            <span className="text-sm font-medium text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              Market Price
            </span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-white/60">Amount</label>
          <Input 
            type="number" 
            step="any"
            icon={<Coins className="w-4 h-4" />}
            {...form.register('quantity')} 
            placeholder="Quantity"
          />
          {form.formState.errors.quantity && <span className="text-xs text-rose-500">{form.formState.errors.quantity.message}</span>}
        </div>

        <div className="mt-auto pt-4 space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm text-white/60">Total (Est)</span>
            <span className="text-sm font-mono text-white">{formatCurrency(estimatedTotal)}</span>
          </div>

          <Button 
            type="submit" 
            variant={side === 'buy' ? 'buy' : 'sell'} 
            className="w-full py-6 text-lg tracking-wide uppercase"
            disabled={placeOrderMut.isPending}
          >
            {placeOrderMut.isPending ? "Processing..." : `${side} ${symbol.replace('USDT', '')}`}
          </Button>
        </div>
      </form>
    </GlassCard>
  );
};
