'use client';

import { CheckCircle2, Clock, AlertCircle, Eye, ExternalLink } from 'lucide-react';
import { formatEth, ORDER_STATUS, type OrderSummary } from '@/lib/api';

interface OrdersTableProps {
  orders: OrderSummary[];
}

function truncateAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTime(ts: number) {
  const d = new Date(ts * 1000);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return d.toLocaleDateString();
}

function statusDisplay(status: number) {
  switch (status) {
    case 1:
      return (
        <>
          <CheckCircle2 className="w-4 h-4 text-amber-500" />
          <span className="text-amber-500 text-sm">Completed</span>
        </>
      );
    case 0:
      return (
        <>
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-amber-500 text-sm">Pending</span>
        </>
      );
    case 2:
      return (
        <>
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm">Disputed</span>
        </>
      );
    default:
      return <span className="text-ink-muted text-sm">{ORDER_STATUS[status] ?? status}</span>;
  }
}

export default function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold mb-2 text-ink">Orders</h2>
          <p className="text-ink-muted">Orders where you are buyer or seller (from chain)</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-6 text-sm font-semibold text-ink-muted uppercase tracking-wider">Order ID</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-ink-muted uppercase tracking-wider">Service</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-ink-muted uppercase tracking-wider">Buyer</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-ink-muted uppercase tracking-wider">Seller</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-ink-muted uppercase tracking-wider">Amount</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-ink-muted uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-ink-muted uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-muted">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.orderId} className="border-b border-border hover:bg-surface-muted transition-all">
                    <td className="py-4 px-6 font-mono text-sm text-ink">{order.orderId.slice(0, 10)}…</td>
                    <td className="py-4 px-6 text-ink">{order.serviceType ?? order.serviceId.slice(0, 8)}</td>
                    <td className="py-4 px-6 font-mono text-sm text-ink-muted">{truncateAddr(order.buyer)}</td>
                    <td className="py-4 px-6 font-mono text-sm text-ink-muted">{truncateAddr(order.seller)}</td>
                    <td className="py-4 px-6 font-mono text-accent">{formatEth(order.totalPrice)} ETH</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">{statusDisplay(order.status)}</div>
                    </td>
                    <td className="py-4 px-6 text-sm text-ink-subtle">{formatTime(order.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
