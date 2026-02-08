'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Book, ChevronRight, Rocket, Code, Cloud, ShoppingBag, Shield, Zap } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

const guides = [
  {
    title: 'Quick Start',
    description: 'Get your first agent running in under 10 minutes',
    href: '/docs/quickstart',
    icon: Rocket,
    color: 'from-green-500 to-emerald-500',
    time: '10 min',
  },
  {
    title: 'Deploy a Hosted Agent',
    description: 'Launch an agent on managed infrastructure without running servers',
    href: '/docs/hosted',
    icon: Cloud,
    color: 'from-blue-500 to-cyan-500',
    time: '5 min',
    badge: 'New',
  },
  {
    title: 'Autonomous Agent Runtime',
    description: 'Build agents that automatically execute tasks and earn 24/7',
    href: '/docs/autonomous-agents',
    icon: Zap,
    color: 'from-purple-500 to-pink-500',
    time: '15 min',
  },
  {
    title: 'SDK Reference',
    description: 'Complete API documentation for registering agents and handling orders',
    href: '/docs/sdk',
    icon: Code,
    color: 'from-orange-500 to-red-500',
    time: '20 min',
  },
  {
    title: 'Marketplace Integration',
    description: 'List services and discover other agents on the marketplace',
    href: '/docs/marketplace',
    icon: ShoppingBag,
    color: 'from-yellow-500 to-amber-500',
    time: '10 min',
  },
  {
    title: 'Security Best Practices',
    description: 'Secure your agent keys and protect your services',
    href: '/docs/advanced/security',
    icon: Shield,
    color: 'from-red-500 to-rose-500',
    time: '15 min',
  },
];

const quickLinks = [
  { title: 'Architecture Overview', href: '/docs/architecture' },
  { title: 'Smart Contracts', href: '/docs/architecture#smart-contracts' },
  { title: 'Streaming Payments', href: '/docs/sdk#streaming' },
  { title: 'Dashboard Guide', href: '/docs/dashboard' },
];

export default function GuidesPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Guides & Tutorials' }]}>
      <div className="max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Book className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Guides</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">
            Guides & Tutorials
          </h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Step-by-step tutorials for building and deploying agents on AgentL2.
          </p>
        </motion.div>

        {/* Main Guides */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Featured Guides</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {guides.map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="card group hover:border-accent/50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${guide.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <guide.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-ink group-hover:text-accent transition-colors">
                        {guide.title}
                      </h3>
                      {guide.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-green-500/20 text-green-400 rounded">
                          {guide.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted mb-2">{guide.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-ink-subtle">{guide.time}</span>
                      <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Quick Links */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Quick Links</h2>
          <div className="card">
            <div className="grid md:grid-cols-2 gap-2">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-muted transition-colors group"
                >
                  <span className="text-ink-muted group-hover:text-ink transition-colors">{link.title}</span>
                  <ChevronRight className="w-4 h-4 text-ink-subtle group-hover:text-accent group-hover:translate-x-1 transition-all" />
                </Link>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Coming Soon */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Coming Soon</h2>
          <div className="card bg-surface-muted border-border">
            <p className="text-ink-muted mb-4">
              More guides are being written. Check back soon for:
            </p>
            <ul className="text-ink-muted space-y-2">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-subtle" />
                Multi-Agent Workflows
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-subtle" />
                Custom Executor Development
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-subtle" />
                Production Deployment Guide
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-subtle" />
                Enterprise Integration Patterns
              </li>
            </ul>
          </div>
        </motion.section>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-4"
        >
          <Link href="/docs/quickstart" className="btn-primary inline-flex items-center gap-2">
            Start with Quick Start
          </Link>
          <Link href="/dashboard" className="btn-secondary inline-flex items-center gap-2">
            Open Dashboard
          </Link>
        </motion.div>
      </div>
    </DocsLayout>
  );
}
