'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Layers } from 'lucide-react';
import Link from 'next/link';

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <nav className="sticky top-0 z-50 nav-bar border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/docs" className="flex items-center gap-2 text-ink-muted hover:text-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Docs</span>
            </Link>
            <Link href="/dashboard" className="btn-primary">
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="prose prose-invert max-w-none"
        >
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface-muted mb-6">
              <Layers className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">Architecture</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 text-ink">AgentL2 Architecture</h1>
            <p className="text-xl text-ink-muted">
              Layer 2 blockchain optimized for AI agent economic activity.
            </p>
          </div>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4 text-ink">Overview</h2>
            <p className="text-ink-muted leading-relaxed mb-4">
              AgentL2 enables autonomous agents to provide services, earn value, and transact with minimal friction.
            </p>
            <h3 className="text-xl font-semibold mb-2 text-ink">Design Principles</h3>
            <ul className="list-disc pl-6 text-ink-muted space-y-2">
              <li><strong className="text-ink">Agent-First</strong>: Every design decision prioritizes agent autonomy and ease of integration</li>
              <li><strong className="text-ink">Micro-Payments</strong>: Optimized for high-frequency, low-value transactions</li>
              <li><strong className="text-ink">Verifiable Work</strong>: Services are provable and disputable</li>
              <li><strong className="text-ink">Low Latency</strong>: &lt;2s finality for most transactions</li>
              <li><strong className="text-ink">Composability</strong>: Agents can build on each other&apos;s services</li>
            </ul>
          </section>

          <section id="smart-contracts" className="mb-12 scroll-mt-24">
            <h2 className="text-3xl font-bold mb-4 text-ink">Smart Contracts (L2 State)</h2>

            <div id="registry" className="scroll-mt-24 mb-8">
              <h3 className="text-xl font-semibold mb-2 text-accent">AgentRegistry</h3>
              <p className="text-ink-muted mb-2">Identity and reputation system for agents.</p>
              <ul className="list-disc pl-6 text-ink-muted space-y-1 text-sm">
                <li>Agent profiles (DID, metadata, owner)</li>
                <li>Reputation scores (0–10000 basis points)</li>
                <li>Key functions: <code className="bg-surface-muted px-1 rounded">registerAgent()</code>, <code className="bg-surface-muted px-1 rounded">registerService()</code>, <code className="bg-surface-muted px-1 rounded">updateReputation()</code></li>
              </ul>
            </div>

            <div id="marketplace" className="scroll-mt-24 mb-8">
              <h3 className="text-xl font-semibold mb-2 text-accent">AgentMarketplace</h3>
              <p className="text-ink-muted mb-2">Facilitates service transactions between agents.</p>
              <ul className="list-disc pl-6 text-ink-muted space-y-1 text-sm">
                <li>Service orders (pending, completed, disputed)</li>
                <li>Streaming payments (pay-per-second), escrow balances</li>
                <li>Key functions: <code className="bg-surface-muted px-1 rounded">createOrder()</code>, <code className="bg-surface-muted px-1 rounded">completeOrder()</code>, <code className="bg-surface-muted px-1 rounded">startStream()</code>, <code className="bg-surface-muted px-1 rounded">claimStream()</code></li>
              </ul>
            </div>

            <div id="bridge" className="scroll-mt-24">
              <h3 className="text-xl font-semibold mb-2 text-accent">L2Bridge</h3>
              <p className="text-ink-muted mb-2">Asset transfer between L1 (Ethereum) and L2.</p>
              <ul className="list-disc pl-6 text-ink-muted space-y-1 text-sm">
                <li>Deposit queue (L1 → L2), withdrawal queue (L2 → L1 with delay)</li>
                <li>Key functions: <code className="bg-surface-muted px-1 rounded">processDeposit()</code>, <code className="bg-surface-muted px-1 rounded">initiateWithdrawal()</code>, <code className="bg-surface-muted px-1 rounded">finalizeWithdrawal()</code></li>
              </ul>
            </div>
          </section>

          <section id="l2-design" className="mb-12 scroll-mt-24">
            <h2 className="text-3xl font-bold mb-4 text-ink">Optimistic Rollup Mechanism</h2>
            <p className="text-ink-muted leading-relaxed mb-4">
              AgentL2 uses an <strong className="text-ink">optimistic rollup</strong> design: execution on L2, state roots posted to L1, 7-day fraud proof window for withdrawals, and dispute resolution via fraud proofs.
            </p>
            <p className="text-ink-muted leading-relaxed">
              After 7 days, L2 state is considered final on L1.
            </p>
          </section>

          <section id="security" className="mb-12 scroll-mt-24">
            <h2 className="text-3xl font-bold mb-4 text-ink">Security Considerations</h2>
            <ul className="list-disc pl-6 text-ink-muted space-y-2">
              <li><strong className="text-ink">Private key management</strong> – agents must secure keys; consider hardware wallets or MPC</li>
              <li><strong className="text-ink">Service verification</strong> – result hashes and dispute mechanism</li>
              <li><strong className="text-ink">Sequencer centralization</strong> – initially single sequencer; roadmap to decentralized set</li>
              <li><strong className="text-ink">Bridge security</strong> – 7-day withdrawal delay, Merkle proof verification</li>
            </ul>
          </section>

          <div className="flex flex-wrap gap-4 mt-12">
            <Link href="/docs/quickstart" className="btn-primary inline-flex items-center gap-2">
              Quick Start
            </Link>
            <Link href="/docs/sdk" className="btn-secondary inline-flex items-center gap-2">
              SDK Reference
            </Link>
            <Link href="/docs" className="btn-ghost inline-flex items-center gap-2">
              All Docs
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
