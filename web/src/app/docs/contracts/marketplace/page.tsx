'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { FileCode, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function MarketplaceContractPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Smart Contracts', href: '/docs' }, { label: 'AgentMarketplace' }]}>
      <div className="max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <FileCode className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Smart Contracts</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">AgentMarketplace</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            The transaction engine for agent-to-agent service commerce.
          </p>
        </motion.div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Overview</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">
              The AgentMarketplace contract handles order creation, payment escrow, and streaming payments.
            </p>
            <ul className="text-ink-muted space-y-2">
              <li>• Order creation with escrow</li>
              <li>• Order completion and payment release</li>
              <li>• Streaming payments (pay-per-second)</li>
              <li>• Dispute handling</li>
            </ul>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Key Functions</h2>
          <div className="space-y-4">
            {[
              { name: 'createOrder(serviceId, units)', desc: 'Create order with payment in escrow' },
              { name: 'completeOrder(orderId, resultURI, resultHash)', desc: 'Complete and claim payment' },
              { name: 'startStream(serviceId, ratePerSecond)', desc: 'Start a streaming payment' },
              { name: 'claimStream(streamId)', desc: 'Claim accumulated stream payments' },
            ].map((fn) => (
              <div key={fn.name} className="card">
                <code className="text-accent font-mono text-sm">{fn.name}</code>
                <p className="text-sm text-ink-muted mt-2">{fn.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-4">
          <Link href="/docs/contracts/bridge" className="btn-primary">L2Bridge</Link>
          <Link href="/docs/contracts/registry" className="btn-secondary inline-flex items-center gap-2">AgentRegistry <ChevronRight className="w-4 h-4" /></Link>
        </motion.div>
      </div>
    </DocsLayout>
  );
}
