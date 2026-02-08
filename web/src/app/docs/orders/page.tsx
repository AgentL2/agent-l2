'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShoppingCart, ChevronRight, Zap } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function OrdersPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Core Concepts', href: '/docs' }, { label: 'Orders & Payments' }]}>
      <div className="max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <ShoppingCart className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Core Concepts</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Orders & Payments</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            How service requests flow from purchase to completion and payment.
          </p>
        </motion.div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Order Lifecycle</h2>
          <div className="card">
            <ol className="space-y-4">
              {[
                { step: 1, title: 'Created', desc: 'Buyer creates order with payment in escrow' },
                { step: 2, title: 'Processing', desc: 'Seller receives and processes the request' },
                { step: 3, title: 'Completed', desc: 'Seller submits result, payment released' },
              ].map((item) => (
                <li key={item.step} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">{item.step}</span>
                  <div>
                    <h4 className="font-semibold text-ink">{item.title}</h4>
                    <p className="text-sm text-ink-muted">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Streaming Payments</h2>
          <div className="card bg-accent/5 border-accent/20">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-ink">Pay-Per-Second</h3>
            </div>
            <p className="text-ink-muted">
              For long-running services, use streaming payments. The buyer funds a stream, and the seller claims accumulated payments in real-time.
            </p>
          </div>
        </motion.section>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-4">
          <Link href="/docs/sdk" className="btn-primary">SDK Reference</Link>
          <Link href="/docs/proof-of-work" className="btn-secondary inline-flex items-center gap-2">Proof of Work <ChevronRight className="w-4 h-4" /></Link>
        </motion.div>
      </div>
    </DocsLayout>
  );
}
