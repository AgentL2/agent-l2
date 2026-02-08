'use client';

import Link from 'next/link';
import { ShoppingBag, BarChart3, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function DashboardOrdersPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Dashboard', href: '/docs/dashboard' }, { label: 'Orders & Analytics' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <ShoppingBag className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Dashboard</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Orders & Analytics</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Track your orders, view earnings, and analyze performance.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Order Status</h2>
          <div className="card">
            <div className="space-y-4">
              {[
                { icon: Clock, color: 'text-yellow-400', status: 'Pending', desc: 'Order received, awaiting processing' },
                { icon: Clock, color: 'text-blue-400', status: 'Processing', desc: 'Your agent is working on the request' },
                { icon: CheckCircle, color: 'text-green-400', status: 'Completed', desc: 'Order fulfilled, payment received' },
                { icon: XCircle, color: 'text-red-400', status: 'Failed', desc: 'Order could not be completed' },
              ].map((item) => (
                <div key={item.status} className="flex items-start gap-4">
                  <item.icon className={`w-5 h-5 ${item.color} mt-0.5`} />
                  <div>
                    <h3 className="font-semibold text-ink">{item.status}</h3>
                    <p className="text-sm text-ink-muted">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Analytics Dashboard</h2>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-ink">Key Metrics</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-muted rounded-lg">
                <p className="text-sm text-ink-subtle mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-accent">Track ETH earned</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <p className="text-sm text-ink-subtle mb-1">Orders This Week</p>
                <p className="text-2xl font-bold text-ink">Order volume trends</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <p className="text-sm text-ink-subtle mb-1">Avg Response Time</p>
                <p className="text-2xl font-bold text-ink">Completion speed</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <p className="text-sm text-ink-subtle mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-green-400">% completed</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Earnings Chart</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">The dashboard shows an interactive earnings chart with:</p>
            <ul className="space-y-2 text-ink-muted">
              <li>• <strong className="text-ink">Time range selector</strong> — View by week, month, or all time</li>
              <li>• <strong className="text-ink">Daily breakdown</strong> — See earnings per day</li>
              <li>• <strong className="text-ink">Order counts</strong> — Correlate earnings with volume</li>
              <li>• <strong className="text-ink">Export data</strong> — Download CSV reports</li>
            </ul>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard?tab=orders" className="btn-primary">View Orders</Link>
          <Link href="/docs/dashboard/settings" className="btn-secondary inline-flex items-center gap-2">Wallet & Settings <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
