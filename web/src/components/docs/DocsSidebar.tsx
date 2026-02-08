'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronDown, Rocket, Layers, Code, Book,
  Cpu, Zap, Cloud, ShoppingBag, LayoutDashboard, Shield,
  Terminal, Github, ArrowLeftRight, Users, Settings, FileCode,
  Search, X, Menu
} from 'lucide-react';

interface DocSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { title: string; href: string; badge?: string }[];
}

const docSections: DocSection[] = [
  {
    title: 'Getting Started',
    icon: Rocket,
    items: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quick Start', href: '/docs/quickstart' },
      { title: 'Installation', href: '/docs/installation' },
      { title: 'First Agent', href: '/docs/first-agent' },
    ]
  },
  {
    title: 'Core Concepts',
    icon: Layers,
    items: [
      { title: 'Architecture', href: '/docs/architecture' },
      { title: 'Agents & DIDs', href: '/docs/agents' },
      { title: 'Services', href: '/docs/services' },
      { title: 'Orders & Payments', href: '/docs/orders' },
      { title: 'Proof of Work', href: '/docs/proof-of-work' },
    ]
  },
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { title: 'Overview', href: '/docs/dashboard' },
      { title: 'Managing Services', href: '/docs/dashboard/services' },
      { title: 'Orders & Analytics', href: '/docs/dashboard/orders' },
      { title: 'Wallet & Settings', href: '/docs/dashboard/settings' },
    ]
  },
  {
    title: 'Hosted Agents',
    icon: Cloud,
    items: [
      { title: 'Overview', href: '/docs/hosted', badge: 'New' },
      { title: 'Deploying Agents', href: '/docs/hosted/deploy' },
      { title: 'Configuration', href: '/docs/hosted/config' },
      { title: 'Monitoring & Logs', href: '/docs/hosted/monitoring' },
    ]
  },
  {
    title: 'Dev Runtime',
    icon: Terminal,
    items: [
      { title: 'Autonomous Agents', href: '/docs/autonomous-agents' },
      { title: 'Custom Executors', href: '/docs/runtime/executors' },
      { title: 'Local Development', href: '/docs/runtime/local' },
    ]
  },
  {
    title: 'Marketplace',
    icon: ShoppingBag,
    items: [
      { title: 'Browsing & Discovery', href: '/docs/marketplace' },
      { title: 'Listing Services', href: '/docs/marketplace/listing' },
      { title: 'Purchasing Services', href: '/docs/marketplace/purchasing' },
    ]
  },
  {
    title: 'SDK Reference',
    icon: Code,
    items: [
      { title: 'AgentClient', href: '/docs/sdk' },
      { title: 'Service Management', href: '/docs/sdk/services' },
      { title: 'Order Handling', href: '/docs/sdk/orders' },
      { title: 'Streaming Payments', href: '/docs/sdk/streaming' },
    ]
  },
  {
    title: 'Smart Contracts',
    icon: FileCode,
    items: [
      { title: 'AgentRegistry', href: '/docs/contracts/registry' },
      { title: 'AgentMarketplace', href: '/docs/contracts/marketplace' },
      { title: 'L2Bridge', href: '/docs/contracts/bridge' },
    ]
  },
  {
    title: 'Advanced',
    icon: Zap,
    items: [
      { title: 'Multi-Agent Workflows', href: '/docs/advanced/multi-agent' },
      { title: 'Security Best Practices', href: '/docs/advanced/security' },
      { title: 'Production Deployment', href: '/docs/advanced/production' },
    ]
  },
];

interface DocsSidebarProps {
  className?: string;
}

export default function DocsSidebar({ className = '' }: DocsSidebarProps) {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(
    docSections.map(s => s.title) // All expanded by default
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/docs') return pathname === '/docs';
    return pathname.startsWith(href);
  };

  const filteredSections = searchQuery
    ? docSections.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(section => section.items.length > 0)
    : docSections;

  const SidebarContent = () => (
    <>
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
          <input
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface-muted border border-border rounded-lg text-sm text-ink placeholder-ink-subtle focus:border-accent focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredSections.map((section) => (
          <div key={section.title}>
            <button
              onClick={() => toggleSection(section.title)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-ink hover:bg-surface-muted rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <section.icon className="w-4 h-4 text-accent" />
                <span>{section.title}</span>
              </div>
              {expandedSections.includes(section.title) ? (
                <ChevronDown className="w-4 h-4 text-ink-subtle" />
              ) : (
                <ChevronRight className="w-4 h-4 text-ink-subtle" />
              )}
            </button>

            <AnimatePresence>
              {expandedSections.includes(section.title) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 pl-4 border-l border-border space-y-1 py-2">
                    {section.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          isActive(item.href)
                            ? 'bg-accent/10 text-accent font-medium'
                            : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
                        }`}
                      >
                        <span>{item.title}</span>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-accent/20 text-accent rounded">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </nav>

      {/* Footer Links */}
      <div className="p-4 border-t border-border space-y-2">
        <a
          href="https://github.com/AgentL2/agent-l2"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors"
        >
          <Github className="w-4 h-4" />
          <span>GitHub</span>
        </a>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-sm text-ink-muted hover:text-ink hover:bg-surface-muted rounded-lg transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-accent text-white rounded-full shadow-lg"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-surface border-r border-border z-50 flex flex-col"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col w-72 bg-surface border-r border-border sticky top-0 h-screen ${className}`}>
        <SidebarContent />
      </aside>
    </>
  );
}
