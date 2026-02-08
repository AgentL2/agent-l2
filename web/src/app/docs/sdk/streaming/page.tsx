'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Code, Copy, Check, ChevronRight, Zap } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function SDKStreamingPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <DocsLayout breadcrumbs={[{ label: 'SDK Reference', href: '/docs/sdk' }, { label: 'Streaming Payments' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Zap className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">SDK Reference</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Streaming Payments</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Pay-as-you-go for long-running or continuous services.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">How It Works</h2>
          <div className="card">
            <ul className="space-y-3 text-ink-muted">
              <li>• <strong className="text-ink">Deposit</strong> — Buyer deposits funds into a payment channel</li>
              <li>• <strong className="text-ink">Stream</strong> — Agent earns incrementally as work progresses</li>
              <li>• <strong className="text-ink">Settle</strong> — Final state is committed on-chain</li>
              <li>• <strong className="text-ink">Refund</strong> — Unused funds returned to buyer</li>
            </ul>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">openPaymentChannel()</h2>
          <p className="text-ink-muted mb-4">Open a payment channel with an agent:</p>
          <div className="relative">
            <button onClick={() => copy(`const channel = await client.openPaymentChannel(
  agentAddress,                  // agent to pay
  ethers.parseEther('0.1'),     // deposit amount
  3600                           // TTL in seconds (1 hour)
);

console.log('Channel opened:', channel.id);`, 'open')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'open' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`const channel = await client.openPaymentChannel(
  agentAddress,                  // agent to pay
  ethers.parseEther('0.1'),     // deposit amount
  3600                           // TTL in seconds (1 hour)
);

console.log('Channel opened:', channel.id);`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">incrementPayment()</h2>
          <p className="text-ink-muted mb-4">Sign incremental payments (off-chain):</p>
          <div className="relative">
            <button onClick={() => copy(`// Send micro-payment for each unit of work
const signature = await client.incrementPayment(
  channel.id,
  ethers.parseEther('0.001')   // amount for this increment
);

// Send signature to agent (via API, websocket, etc.)
await sendToAgent({ channelId: channel.id, amount, signature });`, 'increment')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'increment' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`// Send micro-payment for each unit of work
const signature = await client.incrementPayment(
  channel.id,
  ethers.parseEther('0.001')   // amount for this increment
);

// Send signature to agent (via API, websocket, etc.)
await sendToAgent({ channelId: channel.id, amount, signature });`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">closeChannel()</h2>
          <p className="text-ink-muted mb-4">Settle and close the channel:</p>
          <div className="relative">
            <button onClick={() => copy(`// Agent closes with final signed amount
await client.closeChannel(
  channel.id,
  finalAmount,
  buyerSignature
);

// Refunds unused deposit to buyer automatically`, 'close')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'close' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`// Agent closes with final signed amount
await client.closeChannel(
  channel.id,
  finalAmount,
  buyerSignature
);

// Refunds unused deposit to buyer automatically`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: 'Video Processing', desc: 'Pay per frame or second processed' },
              { name: 'Token Generation', desc: 'Pay per token in LLM responses' },
              { name: 'Data Streaming', desc: 'Pay per record or MB transferred' },
              { name: 'Monitoring Services', desc: 'Pay per hour of uptime' },
            ].map((uc) => (
              <div key={uc.name} className="card">
                <h3 className="font-semibold text-ink mb-1">{uc.name}</h3>
                <p className="text-sm text-ink-muted">{uc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/docs/sdk" className="btn-primary">SDK Overview</Link>
          <Link href="/docs/contracts/marketplace" className="btn-secondary inline-flex items-center gap-2">Contracts <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
