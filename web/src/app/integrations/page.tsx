'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Cpu, Zap, Twitter, Linkedin, Github, MessageCircle, Bot,
  Database, Cloud, Code, Briefcase, Wallet, ChevronRight,
  Check, Lock, ExternalLink, Search, Settings
} from 'lucide-react';
import AppNav from '@/components/AppNav';

type Category = 'all' | 'ai' | 'social' | 'dev' | 'database' | 'crm' | 'blockchain';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: Category;
  icon: React.ReactNode;
  color: string;
  status: 'live' | 'coming' | 'beta';
  features: string[];
}

const integrations: Integration[] = [
  // AI Models
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, o1, o3 models for text generation and reasoning',
    category: 'ai',
    icon: <Cpu className="w-6 h-6" />,
    color: 'from-green-500 to-emerald-600',
    status: 'live',
    features: ['Text generation', 'Code completion', 'Vision', 'Function calling'],
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude 4 Opus/Sonnet for advanced reasoning and analysis',
    category: 'ai',
    icon: <Bot className="w-6 h-6" />,
    color: 'from-orange-500 to-amber-600',
    status: 'live',
    features: ['200K context', 'Code review', 'Analysis', 'Multimodal'],
  },
  {
    id: 'google',
    name: 'Google Gemini',
    description: 'Gemini 2.0 Flash for fast, multimodal AI',
    category: 'ai',
    icon: <Zap className="w-6 h-6" />,
    color: 'from-blue-500 to-indigo-600',
    status: 'live',
    features: ['Fast inference', 'Multimodal', 'Long context', 'Grounding'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek V3/R1 for cost-effective reasoning',
    category: 'ai',
    icon: <Cpu className="w-6 h-6" />,
    color: 'from-purple-500 to-violet-600',
    status: 'live',
    features: ['Low cost', 'Reasoning', 'Code', 'Math'],
  },
  {
    id: 'grok',
    name: 'xAI Grok',
    description: 'Grok 2/3 with real-time X data access',
    category: 'ai',
    icon: <Bot className="w-6 h-6" />,
    color: 'from-gray-700 to-gray-900',
    status: 'beta',
    features: ['Real-time data', 'Humor', 'Vision', 'Uncensored'],
  },
  {
    id: 'kimi',
    name: 'Moonshot Kimi',
    description: 'Kimi with 128K context for long documents',
    category: 'ai',
    icon: <Cpu className="w-6 h-6" />,
    color: 'from-cyan-500 to-teal-600',
    status: 'beta',
    features: ['128K context', 'Document analysis', 'Chinese support'],
  },

  // Social
  {
    id: 'twitter',
    name: 'X (Twitter)',
    description: 'Post tweets, engage with followers, analyze trends',
    category: 'social',
    icon: <Twitter className="w-6 h-6" />,
    color: 'from-gray-800 to-black',
    status: 'live',
    features: ['Post/reply', 'DMs', 'Search', 'Analytics'],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Share content, connect with professionals',
    category: 'social',
    icon: <Linkedin className="w-6 h-6" />,
    color: 'from-blue-600 to-blue-800',
    status: 'coming',
    features: ['Posts', 'Messages', 'Company pages', 'Connections'],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Bots, channels, groups, and messaging',
    category: 'social',
    icon: <MessageCircle className="w-6 h-6" />,
    color: 'from-sky-500 to-blue-600',
    status: 'coming',
    features: ['Bots', 'Channels', 'Groups', 'Inline mode'],
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Server bots, slash commands, webhooks',
    category: 'social',
    icon: <MessageCircle className="w-6 h-6" />,
    color: 'from-indigo-500 to-purple-600',
    status: 'coming',
    features: ['Bots', 'Slash commands', 'Webhooks', 'Voice'],
  },

  // Developer Tools
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repos, issues, PRs, and GitHub Actions',
    category: 'dev',
    icon: <Github className="w-6 h-6" />,
    color: 'from-gray-700 to-gray-900',
    status: 'live',
    features: ['Repos', 'Issues', 'PRs', 'Actions', 'Deployments'],
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy, manage domains, and view logs',
    category: 'dev',
    icon: <Cloud className="w-6 h-6" />,
    color: 'from-gray-800 to-black',
    status: 'coming',
    features: ['Deploy', 'Domains', 'Env vars', 'Logs'],
  },
  {
    id: 'replit',
    name: 'Replit',
    description: 'Create and run repls in the cloud',
    category: 'dev',
    icon: <Code className="w-6 h-6" />,
    color: 'from-orange-500 to-red-600',
    status: 'coming',
    features: ['Create repls', 'Run code', 'Deploy', 'Collaborate'],
  },

  // Databases
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Database, auth, storage, and edge functions',
    category: 'database',
    icon: <Database className="w-6 h-6" />,
    color: 'from-green-500 to-emerald-600',
    status: 'coming',
    features: ['Postgres', 'Auth', 'Storage', 'Edge Functions'],
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Serverless Postgres with branching',
    category: 'database',
    icon: <Database className="w-6 h-6" />,
    color: 'from-green-400 to-cyan-500',
    status: 'coming',
    features: ['Serverless', 'Branching', 'Auto-scaling', 'Free tier'],
  },

  // CRM
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Bases, tables, records, and automations',
    category: 'crm',
    icon: <Briefcase className="w-6 h-6" />,
    color: 'from-blue-500 to-cyan-500',
    status: 'coming',
    features: ['Bases', 'Records', 'Views', 'Automations'],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Pages, databases, and collaboration',
    category: 'crm',
    icon: <Briefcase className="w-6 h-6" />,
    color: 'from-gray-800 to-black',
    status: 'coming',
    features: ['Pages', 'Databases', 'Blocks', 'Search'],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'CRM, marketing, sales, and service',
    category: 'crm',
    icon: <Briefcase className="w-6 h-6" />,
    color: 'from-orange-500 to-red-500',
    status: 'coming',
    features: ['Contacts', 'Deals', 'Marketing', 'Service'],
  },

  // Blockchain
  {
    id: 'erc8004',
    name: 'On-Chain Actions',
    description: 'ERC-8004 Agent Wallets for autonomous transactions',
    category: 'blockchain',
    icon: <Wallet className="w-6 h-6" />,
    color: 'from-purple-600 to-pink-600',
    status: 'beta',
    features: ['Token transfers', 'DeFi', 'NFTs', 'Spending limits'],
  },
];

const categories: { id: Category; name: string; icon: React.ReactNode }[] = [
  { id: 'all', name: 'All', icon: <Zap className="w-4 h-4" /> },
  { id: 'ai', name: 'AI Models', icon: <Bot className="w-4 h-4" /> },
  { id: 'social', name: 'Social', icon: <Twitter className="w-4 h-4" /> },
  { id: 'dev', name: 'Developer', icon: <Code className="w-4 h-4" /> },
  { id: 'database', name: 'Database', icon: <Database className="w-4 h-4" /> },
  { id: 'crm', name: 'CRM', icon: <Briefcase className="w-4 h-4" /> },
  { id: 'blockchain', name: 'Blockchain', icon: <Wallet className="w-4 h-4" /> },
];

export default function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIntegrations = integrations.filter(i => {
    const matchesCategory = selectedCategory === 'all' || i.category === selectedCategory;
    const matchesSearch = i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         i.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-surface text-ink">
      <AppNav />

      <main className="pt-20 pb-12 px-4 sm:px-6 max-w-7xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-accent via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Integrations
            </span>
          </h1>
          <p className="text-xl text-ink-muted max-w-2xl mx-auto">
            Connect your agents to powerful AI models, social platforms, developer tools, and blockchains.
          </p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-subtle" />
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated border border-border rounded-xl text-ink placeholder-ink-subtle focus:border-accent focus:outline-none transition-colors"
              />
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-accent text-white'
                      : 'bg-surface-elevated text-ink-muted hover:bg-surface-muted'
                  }`}
                >
                  {cat.icon}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Integration Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredIntegrations.map((integration, index) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="card group hover:border-accent/50 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-white`}>
                  {integration.icon}
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  integration.status === 'live' ? 'bg-green-500/20 text-green-400' :
                  integration.status === 'beta' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {integration.status === 'live' ? 'Live' : integration.status === 'beta' ? 'Beta' : 'Coming Soon'}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-ink mb-2 group-hover:text-accent transition-colors">
                {integration.name}
              </h3>
              <p className="text-sm text-ink-muted mb-4">{integration.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {integration.features.slice(0, 4).map((feature) => (
                  <span key={feature} className="px-2 py-1 bg-surface-muted rounded text-xs text-ink-subtle">
                    {feature}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                {integration.status === 'live' ? (
                  <button className="btn-primary text-sm py-1.5 px-4">
                    Connect
                  </button>
                ) : (
                  <span className="text-sm text-ink-subtle flex items-center gap-1">
                    <Lock className="w-4 h-4" /> Coming soon
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-ink-subtle group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ERC-8004 Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <div className="card bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500/30">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                <Wallet className="w-8 h-8" />
              </div>
              <div className="flex-1 text-center lg:text-left">
                <h3 className="text-2xl font-bold mb-2">ERC-8004: On-Chain Agent Wallets</h3>
                <p className="text-ink-muted">
                  Enable your agents to transact autonomously on Ethereum with configurable spending limits, 
                  contract allowlists, and full audit trails. The future of autonomous commerce.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/docs/contracts/bridge" className="btn-primary">
                  Learn More
                </Link>
                <Link href="/dashboard?tab=wallet" className="btn-secondary">
                  Configure Wallet
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: 'AI Models', value: '6', sub: 'providers' },
            { label: 'Platforms', value: '15+', sub: 'integrations' },
            { label: 'Actions', value: '50+', sub: 'available' },
            { label: 'Chains', value: '3', sub: 'supported' },
          ].map((stat) => (
            <div key={stat.label} className="card text-center">
              <div className="text-3xl font-bold text-accent">{stat.value}</div>
              <div className="text-sm text-ink-muted">{stat.label}</div>
              <div className="text-xs text-ink-subtle">{stat.sub}</div>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
