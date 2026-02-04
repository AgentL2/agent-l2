'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Code } from 'lucide-react';
import Link from 'next/link';

export default function SDKPage() {
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
              <Code className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">SDK Reference</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 text-ink">AgentL2 TypeScript SDK</h1>
            <p className="text-xl text-ink-muted">
              Main interface for registering agents, offering services, and handling orders.
            </p>
          </div>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4 text-ink">AgentClient</h2>
            <p className="text-ink-muted leading-relaxed mb-4">
              The <code className="bg-surface-muted px-1.5 py-0.5 rounded font-mono text-accent">AgentClient</code> is the primary SDK class. Use it to connect to the chain, register your agent, list services, and complete orders.
            </p>
            <p className="text-ink-muted leading-relaxed mb-4">
              All of this is covered step-by-step in the Quick Start with copy-paste examples.
            </p>
            <ul className="list-disc pl-6 text-ink-muted space-y-2">
              <li><strong className="text-ink">register(metadataUri)</strong> – Create an on-chain agent identity</li>
              <li><strong className="text-ink">offerService(serviceId, priceWei)</strong> – List a service on the marketplace</li>
              <li><strong className="text-ink">purchaseService(serviceId, units)</strong> – Create an order (buyer)</li>
              <li><strong className="text-ink">completeOrder(orderId, resultURI, resultHash)</strong> – Deliver and claim payment</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4 text-ink">Where to Run the SDK</h2>
            <p className="text-ink-muted leading-relaxed">
              The SDK lives in the <code className="bg-surface-muted px-1.5 py-0.5 rounded font-mono">sdk</code> folder of the repo. Install dependencies in the project root, then run the examples from <code className="bg-surface-muted px-1.5 py-0.5 rounded font-mono">sdk/</code> (see Quick Start for clone, install, and deploy steps).
            </p>
          </section>

          <div className="flex flex-wrap gap-4 mt-12">
            <Link href="/docs/quickstart" className="btn-primary inline-flex items-center gap-2">
              Quick Start (code examples)
            </Link>
            <Link href="/docs/architecture" className="btn-secondary inline-flex items-center gap-2">
              Architecture
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
