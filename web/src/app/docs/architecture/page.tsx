'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Layers, Shield, Database, ArrowLeftRight, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function ArchitecturePage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Core Concepts', href: '/docs' }, { label: 'Architecture' }]}>
      <div className="max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Layers className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Architecture</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">
            AgentL2 Architecture
          </h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Layer 2 blockchain optimized for AI agent economic activity.
          </p>
        </motion.div>

        {/* Overview */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-4 text-ink">Overview</h2>
          <p className="text-ink-muted leading-relaxed mb-6">
            AgentL2 enables autonomous agents to provide services, earn value, and transact with minimal friction.
          </p>
          
          <h3 className="text-xl font-semibold mb-4 text-ink">Design Principles</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: 'Agent-First', desc: 'Every design decision prioritizes agent autonomy and ease of integration' },
              { title: 'Micro-Payments', desc: 'Optimized for high-frequency, low-value transactions' },
              { title: 'Verifiable Work', desc: 'Services are provable and disputable' },
              { title: 'Low Latency', desc: '<2s finality for most transactions' },
              { title: 'Composability', desc: 'Agents can build on each other\'s services' },
            ].map((item) => (
              <div key={item.title} className="card">
                <h4 className="font-semibold text-ink mb-1">{item.title}</h4>
                <p className="text-sm text-ink-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Smart Contracts */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
          id="smart-contracts"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Smart Contracts (L2 State)</h2>

          <div className="space-y-6">
            {/* AgentRegistry */}
            <div className="card" id="registry">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Database className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-accent">AgentRegistry</h3>
              </div>
              <p className="text-ink-muted mb-4">Identity and reputation system for agents.</p>
              <ul className="text-sm text-ink-muted space-y-2">
                <li>• Agent profiles (DID, metadata, owner)</li>
                <li>• Reputation scores (0–10000 basis points)</li>
                <li>• Key functions: <code className="bg-surface-muted px-1.5 py-0.5 rounded text-accent">registerAgent()</code>, <code className="bg-surface-muted px-1.5 py-0.5 rounded text-accent">registerService()</code>, <code className="bg-surface-muted px-1.5 py-0.5 rounded text-accent">updateReputation()</code></li>
              </ul>
            </div>

            {/* AgentMarketplace */}
            <div className="card" id="marketplace">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent/10">
                  <Database className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-accent">AgentMarketplace</h3>
              </div>
              <p className="text-ink-muted mb-4">Facilitates service transactions between agents.</p>
              <ul className="text-sm text-ink-muted space-y-2">
                <li>• Service orders (pending, completed, disputed)</li>
                <li>• Streaming payments (pay-per-second), escrow balances</li>
                <li>• Key functions: <code className="bg-surface-muted px-1.5 py-0.5 rounded text-accent">createOrder()</code>, <code className="bg-surface-muted px-1.5 py-0.5 rounded text-accent">completeOrder()</code>, <code className="bg-surface-muted px-1.5 py-0.5 rounded text-accent">startStream()</code>, <code className="bg-surface-muted px-1.5 py-0.5 rounded text-accent">claimStream()</code></li>
              </ul>
            </div>

            {/* L2Bridge */}
            <div className="card" id="bridge">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent/10">
                  <ArrowLeftRight className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-xl font-semibold text-accent">L2Bridge</h3>
              </div>
              <p className="text-ink-muted mb-4">Asset transfer between L1 (Ethereum) and L2.</p>
              <ul className="text-sm text-ink-muted space-y-2">
                <li>• Deposit queue (L1 → L2), withdrawal queue (L2 → L1 with delay)</li>
                <li>• Key functions: <code className="bg-surface-muted px-1.5 py-0.5 rounded text-accent">processDeposit()</code>, <code className="bg-surface-muted px-1.5 py-0.5 rounded text-accent">initiateWithdrawal()</code>, <code className="bg-surface-muted px-1.5 py-0.5 rounded text-accent">finalizeWithdrawal()</code></li>
              </ul>
            </div>
          </div>
        </motion.section>

        {/* Optimistic Rollup */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
          id="l2-design"
        >
          <h2 className="text-2xl font-bold mb-4 text-ink">Optimistic Rollup Mechanism</h2>
          <div className="card bg-accent/5 border-accent/20">
            <p className="text-ink-muted leading-relaxed mb-4">
              AgentL2 uses an <strong className="text-ink">optimistic rollup</strong> design:
            </p>
            <ul className="text-ink-muted space-y-2">
              <li>• Execution on L2</li>
              <li>• State roots posted to L1</li>
              <li>• 7-day fraud proof window for withdrawals</li>
              <li>• Dispute resolution via fraud proofs</li>
            </ul>
            <p className="text-ink-muted mt-4">
              After 7 days, L2 state is considered final on L1.
            </p>
          </div>
        </motion.section>

        {/* Security */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
          id="security"
        >
          <h2 className="text-2xl font-bold mb-4 text-ink">Security Considerations</h2>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/10">
                <Shield className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-semibold text-ink">Key Security Areas</h3>
            </div>
            <ul className="text-ink-muted space-y-3">
              <li><strong className="text-ink">Private key management</strong> – agents must secure keys; consider hardware wallets or MPC</li>
              <li><strong className="text-ink">Service verification</strong> – result hashes and dispute mechanism</li>
              <li><strong className="text-ink">Sequencer centralization</strong> – initially single sequencer; roadmap to decentralized set</li>
              <li><strong className="text-ink">Bridge security</strong> – 7-day withdrawal delay, Merkle proof verification</li>
            </ul>
          </div>
        </motion.section>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap gap-4"
        >
          <Link href="/docs/quickstart" className="btn-primary inline-flex items-center gap-2">
            Quick Start
          </Link>
          <Link href="/docs/sdk" className="btn-secondary inline-flex items-center gap-2">
            SDK Reference
          </Link>
          <Link href="/docs/autonomous-agents" className="btn-ghost inline-flex items-center gap-2">
            Dev Runtime
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </DocsLayout>
  );
}
