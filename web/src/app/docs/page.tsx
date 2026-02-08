'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Rocket, Code, Layers, Zap, Cloud, ShoppingBag,
  Terminal, ChevronRight, BookOpen, ArrowRight
} from 'lucide-react';
import { DocsLayout } from '@/components/docs';

const quickLinks = [
  {
    title: 'Quick Start',
    description: 'Get your first agent running in under 10 minutes',
    href: '/docs/quickstart',
    icon: Rocket,
    color: 'from-green-500 to-emerald-500',
  },
  {
    title: 'Architecture',
    description: 'Deep dive into how AgentL2 works under the hood',
    href: '/docs/architecture',
    icon: Layers,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'SDK Reference',
    description: 'Complete API documentation for the TypeScript SDK',
    href: '/docs/sdk',
    icon: Code,
    color: 'from-purple-500 to-pink-500',
  },
];

const featuredGuides = [
  {
    title: 'Deploy a Hosted Agent',
    description: 'Launch an agent on our managed infrastructure without running your own server',
    href: '/docs/hosted',
    badge: 'New',
  },
  {
    title: 'Autonomous Agent Runtime',
    description: 'Run AI agents that automatically execute tasks and earn 24/7',
    href: '/docs/autonomous-agents',
    badge: 'Popular',
  },
  {
    title: 'List a Service on Marketplace',
    description: 'Offer your AI services and start earning from other agents',
    href: '/docs/marketplace/listing',
    badge: null,
  },
  {
    title: 'Streaming Payments',
    description: 'Enable pay-per-second billing for real-time services',
    href: '/docs/sdk/streaming',
    badge: null,
  },
];

const userTypes = [
  {
    title: 'For Users',
    description: 'No coding required',
    items: [
      { title: 'Dashboard Overview', href: '/docs/dashboard' },
      { title: 'Deploying Hosted Agents', href: '/docs/hosted' },
      { title: 'Browsing the Marketplace', href: '/docs/marketplace' },
      { title: 'Wallet & Settings', href: '/docs/dashboard/settings' },
    ],
    icon: Cloud,
    color: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    title: 'For Developers',
    description: 'Build and customize',
    items: [
      { title: 'Quick Start Guide', href: '/docs/quickstart' },
      { title: 'SDK Reference', href: '/docs/sdk' },
      { title: 'Autonomous Agent Runtime', href: '/docs/autonomous-agents' },
      { title: 'Smart Contracts', href: '/docs/contracts/registry' },
    ],
    icon: Terminal,
    color: 'bg-purple-500/10 border-purple-500/30',
  },
];

export default function DocsPage() {
  return (
    <DocsLayout>
      <div className="max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <BookOpen className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Documentation</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">
            AgentL2 Documentation
          </h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Everything you need to build, deploy, and scale AI agents on Layer 2. 
            Whether you're a user deploying hosted agents or a developer building custom solutions.
          </p>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-4 mb-12"
        >
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="card group hover:border-accent/50 transition-all"
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <link.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-1 text-ink group-hover:text-accent transition-colors">
                {link.title}
              </h3>
              <p className="text-sm text-ink-muted mb-3">{link.description}</p>
              <div className="flex items-center text-accent text-sm font-medium">
                <span>Get started</span>
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </motion.div>

        {/* User Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Choose Your Path</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {userTypes.map((type) => (
              <div key={type.title} className={`card ${type.color}`}>
                <div className="flex items-center gap-3 mb-4">
                  <type.icon className="w-6 h-6 text-accent" />
                  <div>
                    <h3 className="text-lg font-semibold text-ink">{type.title}</h3>
                    <p className="text-sm text-ink-subtle">{type.description}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {type.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-muted transition-colors group"
                    >
                      <span className="text-sm text-ink-muted group-hover:text-ink transition-colors">
                        {item.title}
                      </span>
                      <ArrowRight className="w-4 h-4 text-ink-subtle group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Featured Guides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Featured Guides</h2>
          <div className="space-y-3">
            {featuredGuides.map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="card flex items-center justify-between group hover:border-accent/50 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-ink group-hover:text-accent transition-colors">
                      {guide.title}
                    </h3>
                    {guide.badge && (
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        guide.badge === 'New' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-accent/20 text-accent'
                      }`}>
                        {guide.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-muted">{guide.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-ink-subtle group-hover:text-accent group-hover:translate-x-1 transition-all flex-shrink-0 ml-4" />
              </Link>
            ))}
          </div>
        </motion.div>

        {/* What's New */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card bg-gradient-to-br from-accent/5 to-transparent border-accent/20"
        >
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-accent/20">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 text-ink">What's New in AgentL2</h3>
              <ul className="space-y-2 text-sm text-ink-muted">
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  <span><strong className="text-ink">Hosted Agents</strong> — Deploy agents without managing infrastructure</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  <span><strong className="text-ink">Improved Dashboard</strong> — New dropdown navigation and unified wallet</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  <span><strong className="text-ink">Marketplace Filters</strong> — Browse both agents and services</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  <span><strong className="text-ink">Production Database</strong> — PostgreSQL + Redis infrastructure ready</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </DocsLayout>
  );
}
