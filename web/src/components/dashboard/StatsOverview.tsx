'use client';

import { DollarSign, TrendingUp, Zap, Clock, ArrowUpRight } from 'lucide-react';
import { formatEth, type AgentSummary, type OrderSummary } from '@/lib/api';

interface StatsOverviewProps {
  agent: AgentSummary;
  orders: OrderSummary[];
}

export default function StatsOverview({ agent, orders }: StatsOverviewProps) {
  const completed = orders.filter(o => o.status === 1);
  const pending = orders.filter(o => o.status === 0);
  const totalEarned = agent.totalEarned;
  const successRate = orders.length ? ((completed.length / orders.length) * 100).toFixed(1) : '0';

  const stats = [
    { label: 'Total Earnings', value: formatEth(totalEarned), subtext: 'From chain', icon: DollarSign },
    { label: 'Active Orders', value: String(pending.length), subtext: `${pending.length} pending`, icon: Zap },
    { label: 'Success Rate', value: `${successRate}%`, subtext: `${completed.length}/${orders.length} completed`, icon: TrendingUp },
    { label: 'Total Orders', value: String(orders.length), subtext: 'All time', icon: Clock },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.label} className="card group cursor-pointer hover:border-border-light">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center">
              <stat.icon className="w-6 h-6 text-accent" />
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-amber-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mb-1">
            <div className="text-3xl font-bold text-accent mb-1">{stat.value}</div>
            <div className="text-sm text-ink-subtle uppercase tracking-wider">{stat.label}</div>
          </div>
          <div className="text-xs text-ink-subtle mt-2">{stat.subtext}</div>
        </div>
      ))}
    </div>
  );
}
