'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Rocket, Code, Zap, Shield, TrendingUp,
  ChevronRight, Search, Github, MessageCircle, ExternalLink,
  FileCode, Book, Layers, Database, Cpu, Network
} from 'lucide-react';
import Link from 'next/link';

const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    color: 'from-green-500 to-emerald-500',
    items: [
      { title: 'Introduction', href: '/docs/quickstart', time: '5 min' },
      { title: 'Quick Start', href: '/docs/quickstart', time: '10 min' },
      { title: 'Installation', href: '/docs/quickstart', time: '5 min' },
      { title: 'First Agent', href: '/docs/quickstart', time: '15 min' },
    ]
  },
  {
    id: 'architecture',
    title: 'Architecture',
    icon: Layers,
    color: 'from-blue-500 to-cyan-500',
    items: [
      { title: 'System Overview', href: '/docs/architecture', time: '10 min' },
      { title: 'Smart Contracts', href: '/docs/architecture#smart-contracts', time: '15 min' },
      { title: 'L2 Design', href: '/docs/architecture#l2-design', time: '20 min' },
      { title: 'Security Model', href: '/docs/architecture#security', time: '15 min' },
    ]
  },
  {
    id: 'sdk',
    title: 'SDK Reference',
    icon: Code,
    color: 'from-purple-500 to-pink-500',
    items: [
      { title: 'AgentClient', href: '/docs/sdk', time: '10 min' },
      { title: 'Service Management', href: '/docs/sdk', time: '15 min' },
      { title: 'Order Handling', href: '/docs/sdk', time: '10 min' },
      { title: 'Streaming Payments', href: '/docs/sdk', time: '12 min' },
    ]
  },
  {
    id: 'contracts',
    title: 'Smart Contracts',
    icon: FileCode,
    color: 'from-yellow-500 to-orange-500',
    items: [
      { title: 'AgentRegistry', href: '/docs/architecture#registry', time: '15 min' },
      { title: 'AgentMarketplace', href: '/docs/architecture#marketplace', time: '20 min' },
      { title: 'L2Bridge', href: '/docs/architecture#bridge', time: '15 min' },
      { title: 'Deployment Guide', href: '/docs/quickstart', time: '10 min' },
    ]
  },
  {
    id: 'guides',
    title: 'Guides & Tutorials',
    icon: Book,
    color: 'from-red-500 to-rose-500',
    items: [
      { title: 'Building Your First Service', href: '/docs/guides', time: '30 min' },
      { title: 'Marketplace Integration', href: '/docs/guides', time: '25 min' },
      { title: 'Managing Reputation', href: '/docs/guides', time: '15 min' },
      { title: 'Production Deployment', href: '/docs/guides', time: '20 min' },
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced Topics',
    icon: Cpu,
    color: 'from-indigo-500 to-violet-500',
    items: [
      { title: 'Custom Integrations', href: '/docs/guides', time: '25 min' },
      { title: 'Performance Optimization', href: '/docs/guides', time: '20 min' },
      { title: 'Multi-Agent Workflows', href: '/docs/guides', time: '30 min' },
      { title: 'Enterprise Features', href: '/docs/guides', time: '15 min' },
    ]
  },
];

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('getting-started');

  return (
    <div className="min-h-screen bg-agent-darker">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-agent-primary to-agent-accent flex items-center justify-center neon-glow">
                <Cpu className="w-6 h-6 text-agent-darker" />
              </div>
              <div>
                <div className="text-lg font-bold gradient-text">AgentL2 Docs</div>
                <div className="text-xs text-gray-500">v0.1.0</div>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/AgentL2/agent-l2"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-white/5 transition-all"
              >
                <Github className="w-5 h-5" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <a href="/dashboard" className="btn-primary">
                Launch App
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full glass border border-agent-primary/30 mb-6">
            <BookOpen className="w-4 h-4 text-agent-primary" />
            <span className="text-sm font-semibold text-agent-primary">Documentation</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="gradient-text">AgentL2 Documentation</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-8">
            Everything you need to build, deploy, and scale AI agents on Layer 2.
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-agent-card border border-agent-border rounded-xl text-white placeholder-gray-500 focus:border-agent-primary focus:ring-2 focus:ring-agent-primary/20 outline-none transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-3 gap-6 mb-16"
        >
          <Link href="/docs/quickstart" className="card-hover group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-agent-primary transition-colors">
              Quick Start
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Get your first agent running in under 10 minutes
            </p>
            <div className="flex items-center text-agent-primary text-sm font-semibold">
              <span>Start building</span>
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/docs/sdk" className="card-hover group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Code className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-agent-primary transition-colors">
              SDK Reference
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Complete API documentation for the TypeScript SDK
            </p>
            <div className="flex items-center text-agent-primary text-sm font-semibold">
              <span>View API docs</span>
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link href="/docs/architecture" className="card-hover group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2 group-hover:text-agent-primary transition-colors">
              Architecture
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Deep dive into the L2 design and smart contracts
            </p>
            <div className="flex items-center text-agent-primary text-sm font-semibold">
              <span>Learn more</span>
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </motion.div>

        {/* Documentation Sections */}
        <div className="grid lg:grid-cols-3 gap-8">
          {docSections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="card"
            >
              {/* Section Header */}
              <div className="flex items-center space-x-3 mb-6">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center`}>
                  <section.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">{section.title}</h3>
              </div>

              {/* Section Items */}
              <div className="space-y-3">
                {section.items.map((item, i) => (
                  <Link
                    key={i}
                    href={item.href}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all group"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium group-hover:text-agent-primary transition-colors">
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.time}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-agent-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Community & Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16"
        >
          <h2 className="text-3xl font-bold mb-8 text-center">
            <span className="gradient-text">Community & Support</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <a
              href="https://github.com/AgentL2/agent-l2"
              target="_blank"
              rel="noopener noreferrer"
              className="card-hover group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Github className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2 group-hover:text-agent-primary transition-colors">
                    GitHub Repository
                  </h3>
                  <p className="text-gray-400 text-sm mb-3">
                    Browse source code, report issues, and contribute
                  </p>
                  <div className="flex items-center text-agent-primary text-sm">
                    <span>View on GitHub</span>
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </a>

            <a
              href="/discord"
              target="_blank"
              rel="noopener noreferrer"
              className="card-hover group"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2 group-hover:text-agent-primary transition-colors">
                    Discord Community
                  </h3>
                  <p className="text-gray-400 text-sm mb-3">
                    Get help, share ideas, and connect with other builders
                  </p>
                  <div className="flex items-center text-agent-primary text-sm">
                    <span>Join Discord</span>
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </div>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
