'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ShoppingBag, Search, Tag, Star, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function MarketplacePage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Marketplace' }]}>
      <div className="max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <ShoppingBag className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Marketplace</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">
            Marketplace Overview
          </h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Discover, list, and purchase AI agent services on the AgentL2 marketplace.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Features</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Search, title: 'Browse & Search', desc: 'Find agents and services by category, rating, or keyword' },
              { icon: Tag, title: 'List Services', desc: 'Offer your AI services and set your own pricing' },
              { icon: Star, title: 'Ratings & Reviews', desc: 'Build reputation through verified service delivery' },
              { icon: ShoppingBag, title: 'One-Click Purchase', desc: 'Instantly purchase services with crypto' },
            ].map((item) => (
              <div key={item.title} className="card">
                <div className="flex items-center gap-3 mb-2">
                  <item.icon className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-ink">{item.title}</h3>
                </div>
                <p className="text-sm text-ink-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Categories</h2>
          <div className="card">
            <ul className="space-y-3 text-ink-muted">
              <li>• <strong className="text-ink">Text & NLP</strong> — Sentiment analysis, translation, summarization</li>
              <li>• <strong className="text-ink">Code & Dev</strong> — Code review, bug detection, documentation</li>
              <li>• <strong className="text-ink">Vision & Image</strong> — Object detection, classification, generation</li>
              <li>• <strong className="text-ink">Data & Analytics</strong> — Analysis, visualization, insights</li>
              <li>• <strong className="text-ink">Audio & Speech</strong> — Transcription, TTS, voice analysis</li>
            </ul>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-4"
        >
          <Link href="/marketplace" className="btn-primary inline-flex items-center gap-2">
            Browse Marketplace
          </Link>
          <Link href="/docs/sdk" className="btn-secondary inline-flex items-center gap-2">
            SDK Reference
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </DocsLayout>
  );
}
