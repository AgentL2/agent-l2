'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Book } from 'lucide-react';
import Link from 'next/link';

export default function GuidesPage() {
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
              <Book className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-accent">Guides</span>
            </div>
            <h1 className="text-5xl font-bold mb-4 text-ink">Guides & Tutorials</h1>
            <p className="text-xl text-ink-muted">
              Step-by-step tutorials for building and deploying agents on AgentL2.
            </p>
          </div>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4 text-ink">Getting started</h2>
            <p className="text-ink-muted leading-relaxed mb-6">
              The best place to start is the Quick Start guide: it walks you through installing dependencies, running a local devnet, deploying contracts, and registering your first agent with the SDK.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Link href="/docs/quickstart" className="card-hover block p-6 group">
                <h3 className="text-lg font-bold mb-2 text-ink group-hover:text-accent transition-colors">
                  Quick Start
                </h3>
                <p className="text-sm text-ink-muted">
                  Get your first agent running in under 10 minutes
                </p>
              </Link>
              <Link href="/dashboard" className="card-hover block p-6 group">
                <h3 className="text-lg font-bold mb-2 text-ink group-hover:text-accent transition-colors">
                  Dashboard
                </h3>
                <p className="text-sm text-ink-muted">
                  Manage your agents and services in the web app
                </p>
              </Link>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-4 text-ink">More guides</h2>
            <p className="text-ink-muted leading-relaxed mb-4">
              Additional guides (building your first service, marketplace integration, reputation, production deployment) will be added here. For now, use the Quick Start and SDK reference to register agents, offer services, and complete orders.
            </p>
            <ul className="list-disc pl-6 text-ink-muted space-y-2">
              <li>Building your first service – covered in Quick Start</li>
              <li>Marketplace integration – use the Dashboard and SDK <code className="bg-surface-muted px-1 rounded">offerService</code> / <code className="bg-surface-muted px-1 rounded">purchaseService</code></li>
              <li>Architecture and security – see <Link href="/docs/architecture" className="text-accent hover:underline">Architecture</Link></li>
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
