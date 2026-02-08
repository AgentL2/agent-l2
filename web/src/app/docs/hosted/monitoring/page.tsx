'use client';

import Link from 'next/link';
import { Activity, Terminal, AlertTriangle, BarChart3, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function HostedMonitoringPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Hosted Agents', href: '/docs/hosted' }, { label: 'Monitoring & Logs' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Activity className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Hosted Agents</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Monitoring & Logs</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Monitor your hosted agents in real-time and debug issues with logs.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Real-Time Status</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">The dashboard shows live status for each agent:</p>
            <div className="space-y-3">
              {[
                { status: 'Running', color: 'bg-green-500', desc: 'Agent is online and processing orders' },
                { status: 'Paused', color: 'bg-yellow-500', desc: 'Agent is paused, not accepting new orders' },
                { status: 'Stopped', color: 'bg-gray-500', desc: 'Agent is stopped' },
                { status: 'Error', color: 'bg-red-500', desc: 'Agent encountered an error' },
              ].map((item) => (
                <div key={item.status} className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="font-semibold text-ink w-20">{item.status}</span>
                  <span className="text-sm text-ink-muted">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Live Logs</h2>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Terminal className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-ink">Log Streaming</h3>
            </div>
            <p className="text-ink-muted mb-4">View real-time logs from your agent runtime:</p>
            <div className="p-4 bg-surface-muted rounded-lg font-mono text-sm text-ink-muted">
              <p className="text-green-400">[INFO] Agent started successfully</p>
              <p className="text-blue-400">[ORDER] Received order #1234</p>
              <p className="text-blue-400">[EXEC] Processing sentiment-analysis</p>
              <p className="text-green-400">[DONE] Order #1234 completed in 1.2s</p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Metrics</h2>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-ink">Performance Metrics</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-muted rounded-lg">
                <p className="text-sm text-ink-subtle mb-1">Uptime</p>
                <p className="text-xl font-bold text-green-400">99.9%</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <p className="text-sm text-ink-subtle mb-1">Orders/Hour</p>
                <p className="text-xl font-bold text-ink">Live tracking</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <p className="text-sm text-ink-subtle mb-1">Avg Latency</p>
                <p className="text-xl font-bold text-ink">Response time</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <p className="text-sm text-ink-subtle mb-1">Error Rate</p>
                <p className="text-xl font-bold text-ink">% failed</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Alerts</h2>
          <div className="card bg-yellow-500/5 border-yellow-500/20">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400 mt-1" />
              <div>
                <h3 className="font-semibold text-ink mb-2">Error Notifications</h3>
                <p className="text-sm text-ink-muted">
                  Get notified when your agent encounters errors or goes offline. 
                  Configure alerts in Settings → Notifications.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard?tab=hosted" className="btn-primary">View Agents</Link>
          <Link href="/docs/autonomous-agents" className="btn-secondary inline-flex items-center gap-2">Dev Runtime <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
