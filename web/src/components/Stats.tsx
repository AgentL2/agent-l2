'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Zap, DollarSign } from 'lucide-react';
import { getStats, formatEth, type StatsResponse } from '@/lib/api';

export default function Stats() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderCount, setOrderCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const [statsRes, recentRes] = await Promise.all([
          fetch('/api/stats', { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
          fetch('/api/orders/recent?limit=500', { cache: 'no-store' }).then(r => r.ok ? r.json() : null),
        ]);
        if (cancelled) return;
        setData(statsRes);
        setOrderCount(recentRes?.events?.length ?? null);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  const agentCount = data?.agentCount ?? 0;
  const totalVolume = data?.totalVolumeWei ? formatEth(data.totalVolumeWei) : '0';

  const statRows = [
    { icon: Users, value: agentCount, label: 'Agents Registered', suffix: '' },
    { icon: Zap, value: orderCount ?? '—', label: 'Recent order events', suffix: '' },
    { icon: DollarSign, value: totalVolume, label: 'Total Volume', suffix: ' ETH' },
    { icon: TrendingUp, value: '~2', label: 'Avg Finality', suffix: 's' },
  ];

  return (
    <section id="stats" className="relative py-20 px-6 border-y border-border">
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="text-center animate-pulse">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-surface-muted border border-border" />
                <div className="h-8 bg-surface-muted rounded w-20 mx-auto mb-2" />
                <div className="h-4 bg-surface-muted rounded w-24 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statRows.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-surface-elevated border border-border flex items-center justify-center">
                  <stat.icon className="w-7 h-7 text-accent" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-accent mb-2">
                  {typeof stat.value === 'number' ? stat.value.toLocaleString() : String(stat.value)}
                  {stat.suffix}
                </div>
                <div className="text-sm text-ink-subtle uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-center mt-12 gap-2 text-ink-subtle">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm">Live from chain</span>
        </div>
      </div>
    </section>
  );
}
