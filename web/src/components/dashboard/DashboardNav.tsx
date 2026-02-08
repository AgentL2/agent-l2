'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  LayoutDashboard, Bot, ShoppingBag, BarChart3, Settings,
  Wallet, Cpu, ChevronDown, LogOut, Menu, X, Store, ArrowLeftRight, ShieldCheck, Zap
} from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';

interface DashboardNavProps {
  activeTab: string;
  setActiveTab: (tab: 'overview' | 'services' | 'orders' | 'analytics' | 'proofofwork' | 'runtime' | 'settings' | 'bridge') => void;
  isConnected: boolean;
  address: string | null;
}

const navItems = [
  { id: 'overview' as const, icon: LayoutDashboard, label: 'Overview' },
  { id: 'services' as const, icon: Bot, label: 'Services' },
  { id: 'orders' as const, icon: ShoppingBag, label: 'Orders' },
  { id: 'runtime' as const, icon: Zap, label: 'Runtime' },
  { id: 'analytics' as const, icon: BarChart3, label: 'Analytics' },
  { id: 'proofofwork' as const, icon: ShieldCheck, label: 'Proof of work' },
  { id: 'bridge' as const, icon: ArrowLeftRight, label: 'Bridge' },
  { id: 'settings' as const, icon: Settings, label: 'Settings' },
];

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function DashboardNav({ activeTab, setActiveTab, isConnected, address }: DashboardNavProps) {
  const { disconnect } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 nav-bar">
      <div className="max-w-[1800px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
              <Cpu className="w-5 h-5 text-accent" />
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold text-ink">AgentL2</div>
              <div className="text-xs text-ink-subtle">Dashboard</div>
            </div>
          </a>

          <div className="hidden lg:flex items-center gap-2">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === item.id
                    ? 'bg-accent text-white'
                    : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </motion.button>
            ))}
            <Link
              href="/marketplace"
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-ink-muted hover:text-ink hover:bg-surface-muted transition-all"
            >
              <Store className="w-4 h-4" />
              <span>Marketplace</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isConnected && address && (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg bg-surface-muted hover:bg-surface-elevated transition-colors border border-border"
                >
                  <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center">
                    <Bot className="w-4 h-4 text-accent" />
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-semibold text-ink">Agent</div>
                    <div className="text-xs text-ink-subtle font-mono">{truncateAddress(address)}</div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-ink-muted transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </motion.button>

                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-64 bg-surface-elevated border border-border rounded-xl overflow-hidden shadow-xl"
                  >
                    <div className="p-4 border-b border-border">
                      <div className="font-mono text-xs text-ink-muted break-all">{address}</div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => { disconnect(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-surface-muted"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-ink" /> : <Menu className="w-6 h-6 text-ink" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="lg:hidden border-t border-border py-4"
          >
            <div className="space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === item.id
                      ? 'bg-accent text-white'
                      : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              ))}
              <Link
                href="/marketplace"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-all"
              >
                <Store className="w-5 h-5" />
                <span>Marketplace</span>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
