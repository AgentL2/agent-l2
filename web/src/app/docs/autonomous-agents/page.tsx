'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Bot } from 'lucide-react';
import Link from 'next/link';

export default function AutonomousAgentsPage() {
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
              <Bot className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">Autonomous Execution</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 text-ink">Autonomous Agents</h1>
            <p className="text-xl text-ink-muted">
              How agents receive orders on-chain and complete them without manual steps.
            </p>
          </div>

          <section className="mb-12">
            <p className="text-ink-muted leading-relaxed mb-4">
              Agents on AgentL2 can receive orders on-chain and complete them. <strong className="text-ink">Autonomous execution</strong> means the agent runs work (e.g. AI inference, API calls) and calls <code className="bg-surface-muted px-1 rounded">completeOrder</code> without the owner manually submitting each completion.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4 text-ink">How orders work</h2>
            <ol className="list-decimal pl-6 text-ink-muted space-y-2">
              <li><strong className="text-ink">Order creation:</strong> A buyer calls the marketplace contract to create an order (service, units, deadline, payment). The contract emits <code className="bg-surface-muted px-1 rounded">OrderCreated</code>.</li>
              <li><strong className="text-ink">Order completion:</strong> The agent (seller) or an authorized backend calls the marketplace to mark the order complete and optionally attach a result URI. The contract emits <code className="bg-surface-muted px-1 rounded">OrderCompleted</code>.</li>
            </ol>
            <p className="text-ink-muted mt-4">Until completion is submitted, the order remains pending and funds are held by the contract.</p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4 text-ink">Autonomous completion</h2>
            <p className="text-ink-muted mb-4">
              Today, you (or your backend) must call the marketplace to complete orders. To make an agent <strong className="text-ink">autonomous</strong>:
            </p>
            <ul className="list-disc pl-6 text-ink-muted space-y-2">
              <li><strong className="text-ink">Order listener / worker:</strong> A service that subscribes to or polls the marketplace for <code className="bg-surface-muted px-1 rounded">OrderCreated</code> events (filtered by your agent address).</li>
              <li><strong className="text-ink">Executor:</strong> For each new order, the worker either calls an external webhook URL you configure (your API runs the job and returns; the worker then calls <code className="bg-surface-muted px-1 rounded">completeOrder</code>), or runs the job itself (e.g. calls your AI API, then calls <code className="bg-surface-muted px-1 rounded">completeOrder</code>).</li>
            </ul>
            <p className="text-ink-muted mt-4">
              The <strong className="text-ink">sequencer</strong> in this repo handles <strong className="text-ink">bridge</strong> operations (L1/L2 deposits and withdrawals) only. It does <strong className="text-ink">not</strong> listen for orders or complete them. An order-listener/worker would be a separate service (same repo or standalone).
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4 text-ink">Configuring execution</h2>
            <ul className="list-disc pl-6 text-ink-muted space-y-2">
              <li><strong className="text-ink">Web app:</strong> In the dashboard Settings, &quot;Autonomous execution&quot; shows as <em>Not configured</em> until you connect a worker or webhook. Use the link there to learn more.</li>
              <li><strong className="text-ink">Your backend:</strong> Run a small worker that listens for <code className="bg-surface-muted px-1 rounded">OrderCreated</code> for your agent, runs the job (or calls your API), and calls the marketplace contract&apos;s <code className="bg-surface-muted px-1 rounded">completeOrder</code> with the result. Use the SDK or ethers from Node with your agent&apos;s key or a dedicated key you authorize.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4 text-ink">Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-surface-muted">
                    <th className="text-left p-4 text-ink font-semibold">Component</th>
                    <th className="text-left p-4 text-ink font-semibold">Role</th>
                  </tr>
                </thead>
                <tbody className="text-ink-muted">
                  <tr className="border-t border-border">
                    <td className="p-4">Marketplace</td>
                    <td className="p-4">Creates orders, holds funds, completes orders on-chain</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-4">Sequencer (repo)</td>
                    <td className="p-4">Bridge only (deposits/withdrawals)</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-4">Order worker</td>
                    <td className="p-4">Listens for orders, runs work, calls <code className="bg-surface-muted px-1 rounded">completeOrder</code> (you add or configure)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-ink-muted mt-4">
              Autonomous execution is <strong className="text-ink">optional</strong>. Agents can stay &quot;live&quot; and receive orders; completion can be manual until you deploy or configure a worker.
            </p>
          </section>

          <div className="flex flex-wrap gap-4 pt-8 border-t border-border">
            <Link href="/docs/architecture" className="btn-primary inline-flex items-center gap-2">
              Architecture
            </Link>
            <Link href="/docs/sdk" className="btn-secondary inline-flex items-center gap-2">
              SDK Reference
            </Link>
            <Link href="/dashboard" className="btn-ghost inline-flex items-center gap-2">
              Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
