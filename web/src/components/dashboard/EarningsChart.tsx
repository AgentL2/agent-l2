'use client';

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatEth, type OrderSummary } from '@/lib/api';

interface EarningsChartProps {
  orders: OrderSummary[];
}

type TimeRange = 'week' | 'month' | 'all';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function CustomTooltip(props: { active?: boolean; payload?: Array<{ value?: number; payload?: { orders: number } }>; label?: string }) {
  const { active, payload, label } = props;
  if (!active || !payload?.length || label == null) return null;
  const dayIndex = DAYS_SHORT.indexOf(String(label));
  const fullDay = dayIndex >= 0 ? DAYS_FULL[dayIndex] : String(label);
  const value = Number(payload[0]?.value ?? 0);
  const orderCount = payload[0]?.payload?.orders ?? 0;
  
  return (
    <div className="px-4 py-3 rounded-xl border border-border bg-surface-elevated shadow-xl">
      <p className="text-sm font-semibold text-ink mb-2">{fullDay}</p>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-ink-subtle text-sm">Earnings</span>
          <span className="text-accent font-mono font-bold">{value.toFixed(4)} ETH</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-ink-subtle text-sm">Orders</span>
          <span className="text-ink font-semibold">{orderCount}</span>
        </div>
      </div>
    </div>
  );
}

export default function EarningsChart({ orders }: EarningsChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  const { chartData, totalEarned, completedCount, percentChange } = useMemo(() => {
    const byDay: Record<number, { earnings: number; orders: number }> = {};
    for (let i = 0; i < 7; i++) {
      byDay[i] = { earnings: 0, orders: 0 };
    }
    
    let total = 0n;
    const completed = orders.filter(o => o.status === 1);
    
    for (const o of completed) {
      const date = new Date(o.createdAt * 1000);
      const day = date.getDay();
      const amt = BigInt(o.totalPrice);
      byDay[day].earnings += Number(amt) / 1e18;
      byDay[day].orders += 1;
      total += amt;
    }
    
    const chartData = DAYS_SHORT.map((name, i) => ({ 
      name, 
      earnings: byDay[i].earnings,
      orders: byDay[i].orders 
    }));
    
    // Calculate fake percent change for now (would be real with historical data)
    const percentChange = completed.length > 0 ? 12.5 : 0;
    
    return { 
      chartData, 
      totalEarned: formatEth(total), 
      completedCount: completed.length,
      percentChange 
    };
  }, [orders]);

  const isPositive = percentChange >= 0;

  return (
    <div className="card h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-xl font-bold text-ink">Earnings</h3>
            {completedCount > 0 && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold ${
                isPositive 
                  ? 'bg-green-500/10 text-green-400' 
                  : 'bg-red-500/10 text-red-400'
              }`}>
                {isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>{isPositive ? '+' : ''}{percentChange}%</span>
              </div>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-accent">
              {totalEarned} ETH
            </span>
            <span className="text-ink-subtle text-sm">
              · {completedCount} orders
            </span>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1 bg-surface-muted rounded-lg p-1">
          {(['week', 'month', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                timeRange === range
                  ? 'bg-accent text-white'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-elevated'
              }`}
            >
              {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#d97706" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#d97706" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#57534e" 
              strokeOpacity={0.3}
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fill: '#78716c', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              tick={{ fill: '#78716c', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v > 0 ? `${v}` : '0'}
              dx={-10}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: '#d97706', strokeWidth: 1, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="earnings"
              stroke="#d97706"
              strokeWidth={3}
              fill="url(#earningsGradient)"
              dot={false}
              activeDot={{
                r: 6,
                fill: '#d97706',
                stroke: '#1c1917',
                strokeWidth: 3,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
        <div className="text-center">
          <div className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Avg Daily</div>
          <div className="font-bold text-ink">
            {(chartData.reduce((sum, d) => sum + d.earnings, 0) / 7).toFixed(4)} ETH
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Total Orders</div>
          <div className="font-bold text-ink">
            {chartData.reduce((sum, d) => sum + d.orders, 0)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-ink-subtle uppercase tracking-wider mb-1">Best Day</div>
          <div className="font-bold text-accent">
            {Math.max(...chartData.map(d => d.earnings)).toFixed(4)} ETH
          </div>
        </div>
      </div>
    </div>
  );
}
