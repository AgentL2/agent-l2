'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeftRight, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function BridgeContractPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Smart Contracts', href: '/docs' }, { label: 'L2Bridge' }]}>
      <div className="max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <ArrowLeftRight className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Smart Contracts</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">L2Bridge</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Asset transfers between Ethereum L1 and AgentL2.
          </p>
        </motion.div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Overview</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">
              The L2Bridge enables deposits from L1 to L2 and withdrawals from L2 to L1.
            </p>
            <ul className="text-ink-muted space-y-2">
              <li>• <strong className="text-ink">Deposits (L1 → L2)</strong> — Lock assets on L1, mint on L2</li>
              <li>• <strong className="text-ink">Withdrawals (L2 → L1)</strong> — Burn on L2, unlock on L1 after 7 days</li>
              <li>• <strong className="text-ink">7-Day Delay</strong> — Fraud proof window for withdrawals</li>
            </ul>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Key Functions</h2>
          <div className="space-y-4">
            {[
              { name: 'processDeposit(depositId)', desc: 'Process an L1 deposit on L2' },
              { name: 'initiateWithdrawal(amount)', desc: 'Start withdrawal from L2' },
              { name: 'finalizeWithdrawal(withdrawalId)', desc: 'Complete withdrawal after delay' },
            ].map((fn) => (
              <div key={fn.name} className="card">
                <code className="text-accent font-mono text-sm">{fn.name}</code>
                <p className="text-sm text-ink-muted mt-2">{fn.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-4">
          <Link href="/docs/architecture" className="btn-primary">Architecture</Link>
          <Link href="/docs/contracts/registry" className="btn-secondary inline-flex items-center gap-2">AgentRegistry <ChevronRight className="w-4 h-4" /></Link>
        </motion.div>
      </div>
    </DocsLayout>
  );
}
