'use client';

import { CheckCircle2, Clock, AlertCircle, DollarSign } from 'lucide-react';
import { formatEth, ORDER_STATUS, type OrderSummary } from '@/lib/api';

interface RecentActivityProps {
  orders: OrderSummary[];
}

function formatTimeAgo(ts: number) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86400)} days ago`;
}

function statusIcon(status: number) {
  switch (status) {
    case 1: return CheckCircle2;
    case 0: return Clock;
    case 2: return AlertCircle;
    default: return DollarSign;
  }
}

function statusColor(status: number) {
  switch (status) {
    case 1: return 'text-amber-500';
    case 0: return 'text-amber-500';
    case 2: return 'text-red-400';
    default: return 'text-ink-muted';
  }
}

export default function RecentActivity({ orders }: RecentActivityProps) {
  const recent = orders.slice(0, 8);

  return (
    <div className="card h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-ink">Recent Activity</h3>
        <span className="text-sm text-accent">{orders.length} orders</span>
      </div>

      <div className="space-y-4">
        {recent.length === 0 ? (
          <p className="text-ink-muted text-sm">No orders yet. Create or complete orders to see activity.</p>
        ) : (
          recent.map((order) => {
            const Icon = statusIcon(order.status);
            const isSeller = true; // we show all orders for this agent
            const amount = order.status === 1 ? `+${formatEth(order.totalPrice)}` : formatEth(order.totalPrice);
            return (
              <div
                key={order.orderId}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-muted transition-all"
              >
                <div className={`w-10 h-10 rounded-lg bg-surface-muted flex items-center justify-center ${statusColor(order.status)}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm text-ink">
                      {ORDER_STATUS[order.status] ?? 'Order'} — {order.serviceType ?? 'Service'}
                    </div>
                    <div className="text-sm font-mono text-amber-500 whitespace-nowrap">
                      {amount} ETH
                    </div>
                  </div>
                  <div className="text-xs text-ink-muted truncate">
                    Order {order.orderId.slice(0, 10)}…
                  </div>
                  <div className="text-xs text-ink-subtle mt-1">
                    {formatTimeAgo(order.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
