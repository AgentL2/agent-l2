'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  LayoutDashboard, Bot, ShoppingBag, BarChart3, Settings,
  Menu, X, Store, ArrowLeftRight, ShieldCheck, Zap, Cloud,
  ChevronDown, Code, BookOpen, Github
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useWallet } from '@/contexts/WalletContext';
import NavDropdown from '@/components/navigation/NavDropdown';
import WalletDropdown from '@/components/navigation/WalletDropdown';

interface DashboardNavProps {
  activeTab: string;
  setActiveTab: (tab: 'overview' | 'services' | 'orders' | 'analytics' | 'proofofwork' | 'runtime' | 'hosted' | 'settings' | 'bridge') => void;
  isConnected: boolean;
  address: string | null;
}

// Dropdown menu items
const overviewItems = [
  { 
    label: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard,
    description: 'Your agent overview & stats'
  },
  { 
    label: 'Orders', 
    href: '/dashboard?tab=orders', 
    icon: ShoppingBag,
    description: 'View and manage orders'
  },
  { 
    label: 'Analytics', 
    href: '/dashboard?tab=analytics', 
    icon: BarChart3,
    description: 'Performance insights'
  },
];

const agentsItems = [
  { 
    label: 'Services', 
    href: '/dashboard?tab=services', 
    icon: Bot,
    description: 'Manage your AI services'
  },
  { 
    label: 'Hosted Agents', 
    href: '/dashboard?tab=hosted', 
    icon: Cloud,
    description: 'Deploy & manage hosted agents'
  },
  { 
    label: 'Proof of Work', 
    href: '/dashboard?tab=proofofwork', 
    icon: ShieldCheck,
    description: 'View work verification'
  },
];

const developersItems = [
  { 
    label: 'Dev Runtime', 
    href: '/dashboard?tab=runtime', 
    icon: Zap,
    description: 'Local development environment'
  },
  { 
    label: 'Documentation', 
    href: '/docs', 
    icon: BookOpen,
    description: 'API reference & guides'
  },
  { 
    label: 'GitHub', 
    href: 'https://github.com/AgentL2/agent-l2', 
    icon: Github,
    description: 'Source code & examples',
    external: true
  },
];

export default function DashboardNav({ activeTab, setActiveTab, isConnected, address }: DashboardNavProps) {
  const { connect, disconnect } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOverviewActive = ['overview', 'orders', 'analytics'].includes(activeTab);
  const isAgentsActive = ['services', 'hosted', 'proofofwork'].includes(activeTab);
  const isDevelopersActive = ['runtime'].includes(activeTab);

  return (
    <nav className="sticky top-0 z-50 nav-bar">
      <div className="max-w-[1800px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Logo size={40} />
            <div className="hidden sm:block">
              <div className="text-lg font-bold text-ink">AgentL2</div>
              <div className="text-xs text-ink-subtle">Dashboard</div>
            </div>
          </Link>

          {/* Desktop Nav with Dropdowns */}
          <div className="hidden lg:flex items-center gap-1">
            <NavDropdown 
              label="Overview" 
              items={overviewItems} 
              isActive={isOverviewActive}
            />
            <NavDropdown 
              label="Agents" 
              items={agentsItems}
              isActive={isAgentsActive}
            />
            <Link
              href="/marketplace"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-ink-muted hover:text-ink hover:bg-surface-muted transition-all"
            >
              <Store className="w-4 h-4" />
              <span>Marketplace</span>
            </Link>
            <NavDropdown 
              label="Developers" 
              items={developersItems}
              isActive={isDevelopersActive}
            />
            <Link
              href="/dashboard?tab=bridge"
              onClick={() => setActiveTab('bridge')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'bridge'
                  ? 'text-accent bg-accent-muted'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Bridge</span>
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Wallet/Agent Dropdown */}
            <WalletDropdown 
              isConnected={isConnected}
              address={address}
              onConnect={connect}
              onDisconnect={disconnect}
            />

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-muted"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-ink" /> : <Menu className="w-6 h-6 text-ink" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border py-4 overflow-hidden"
            >
              <div className="space-y-6">
                {/* Overview Section */}
                <div>
                  <div className="text-xs font-semibold text-ink-subtle uppercase tracking-wider px-3 mb-2">
                    Overview
                  </div>
                  <div className="space-y-1">
                    {overviewItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-all"
                      >
                        <item.icon className="w-5 h-5 text-accent" />
                        <div>
                          <div className="font-medium text-ink">{item.label}</div>
                          <div className="text-xs text-ink-subtle">{item.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Agents Section */}
                <div>
                  <div className="text-xs font-semibold text-ink-subtle uppercase tracking-wider px-3 mb-2">
                    Agents
                  </div>
                  <div className="space-y-1">
                    {agentsItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-all"
                      >
                        <item.icon className="w-5 h-5 text-accent" />
                        <div>
                          <div className="font-medium text-ink">{item.label}</div>
                          <div className="text-xs text-ink-subtle">{item.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Marketplace & Bridge */}
                <div className="space-y-1">
                  <Link
                    href="/marketplace"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-all"
                  >
                    <Store className="w-5 h-5 text-accent" />
                    <div>
                      <div className="font-medium text-ink">Marketplace</div>
                      <div className="text-xs text-ink-subtle">Browse agents & services</div>
                    </div>
                  </Link>
                  <button
                    onClick={() => { setActiveTab('bridge'); setMobileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-all text-left"
                  >
                    <ArrowLeftRight className="w-5 h-5 text-accent" />
                    <div>
                      <div className="font-medium text-ink">Bridge</div>
                      <div className="text-xs text-ink-subtle">Cross-chain transfers</div>
                    </div>
                  </button>
                </div>

                {/* Developers Section */}
                <div>
                  <div className="text-xs font-semibold text-ink-subtle uppercase tracking-wider px-3 mb-2">
                    Developers
                  </div>
                  <div className="space-y-1">
                    {developersItems.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        target={item.external ? '_blank' : undefined}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-all"
                      >
                        <item.icon className="w-5 h-5 text-accent" />
                        <div>
                          <div className="font-medium text-ink">{item.label}</div>
                          <div className="text-xs text-ink-subtle">{item.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
