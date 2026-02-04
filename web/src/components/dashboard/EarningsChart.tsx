'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { formatEth, type OrderSummary } from '@/lib/api';

interface EarningsChartProps {
  orders: OrderSummary[];
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function CustomTooltip(props: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) {
  const { active, payload, label } = props;
  if (!active || !payload?.length || label == null) return null;
  const dayIndex = DAYS_SHORT.indexOf(String(label));
  const fullDay = dayIndex >= 0 ? DAYS_FULL[dayIndex] : String(label);
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div
      className="px-4 py-3 rounded-xl border border-border bg-surface-elevated shadow-lg"
      style={{ minWidth: 140 }}
    >
      <p className="text-sm font-semibold text-ink mb-1">{fullDay}</p>
      <p className="text-accent font-mono font-semibold">{value.toFixed(6)} ETH</p>
    </div>
  );
}

export default function EarningsChart({ orders }: EarningsChartProps) {
  const { chartData, totalEarned } = useMemo(() => {
    const byDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    let total = 0n;
    const completed = orders.filter(o => o.status === 1);
    for (const o of completed) {
      const date = new Date(o.createdAt * 1000);
      const day = date.getDay();
      const amt = BigInt(o.totalPrice);
      byDay[day] += Number(amt) / 1e18;
      total += amt;
    }
    const chartData = DAYS_SHORT.map((name, i) => ({ name, earnings: byDay[i], full: byDay[i] }));
    return { chartData, totalEarned: formatEth(total) };
  }, [orders]);

  return (
    <div className="card h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold mb-1 text-ink">Earnings by Day</h3>
          <p className="text-ink-subtle text-sm">Completed orders · Total: {totalEarned} ETH</p>
        </div>
        <div className="flex items-center gap-2 text-accent">
          <TrendingUp className="w-5 h-5" />
          <span className="font-semibold">{orders.filter(o => o.status === 1).length} completed</span>
        </div>
      </div>

      <div className="h-64 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--tw-text-ink-subtle)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--tw-border-border)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--tw-text-ink-subtle)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 0.001 ? `${v} ETH` : v)}
              width={52}
            />
            <Tooltip
              content={(p: { active?: boolean; payload?: Array<{ value?: number }>; label?: string }) => (
                <CustomTooltip active={p.active} payload={p.payload} label={p.label} />
              )}
              cursor={{ fill: 'var(--tw-bg-surface-muted)', radius: 4 }}
            />
            <Bar dataKey="earnings" radius={[4, 4, 0, 0]} maxBarSize={48} isAnimationActive={true}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="#d97706"
                  fillOpacity={0.9}
                  style={{ outline: 'none' }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
