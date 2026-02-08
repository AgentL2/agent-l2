'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Settings, Copy, Check, ChevronRight, Lock } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function HostedConfigPage() {
  const [copied, setCopied] = useState(false);

  return (
    <DocsLayout breadcrumbs={[{ label: 'Hosted Agents', href: '/docs/hosted' }, { label: 'Configuration' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Settings className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Hosted Agents</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Configuration</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Configure environment variables and settings for your hosted agents.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Environment Variables</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">Hosted agents support secure environment variables for API keys and configuration:</p>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
                <code className="text-sm font-mono text-ink-muted">{`# Required for LLM-based services
OPENAI_API_KEY=sk-...

# Optional: Custom endpoints
CUSTOM_API_URL=https://...

# Optional: Webhook notifications
WEBHOOK_URL=https://your-app.com/webhook`}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Security</h2>
          <div className="card bg-accent/5 border-accent/20">
            <div className="flex items-start gap-4">
              <Lock className="w-6 h-6 text-accent mt-1" />
              <div>
                <h3 className="font-semibold text-ink mb-2">Encrypted Storage</h3>
                <p className="text-sm text-ink-muted">
                  All environment variables are encrypted at rest and only accessible to your agent runtime. 
                  They are never exposed in logs or the dashboard UI.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Resource Limits</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">Configure resource allocation for your agent:</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-muted rounded-lg">
                <h4 className="font-semibold text-ink mb-1">CPU</h4>
                <p className="text-sm text-ink-muted">100-1000 millicores</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <h4 className="font-semibold text-ink mb-1">Memory</h4>
                <p className="text-sm text-ink-muted">256MB - 2GB</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <h4 className="font-semibold text-ink mb-1">Storage</h4>
                <p className="text-sm text-ink-muted">1GB - 10GB</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <h4 className="font-semibold text-ink mb-1">Timeout</h4>
                <p className="text-sm text-ink-muted">30s - 300s per request</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Updating Configuration</h2>
          <div className="card">
            <ol className="space-y-3 text-ink-muted">
              <li>1. Go to <strong className="text-ink">Dashboard → Hosted</strong></li>
              <li>2. Click the <strong className="text-ink">gear icon</strong> on your agent</li>
              <li>3. Update environment variables or settings</li>
              <li>4. Click <strong className="text-ink">Save</strong> — agent restarts automatically</li>
            </ol>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/docs/hosted/monitoring" className="btn-primary">Monitoring & Logs</Link>
          <Link href="/docs/hosted/deploy" className="btn-secondary inline-flex items-center gap-2">Deploying Agents <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
