'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { LayoutDashboard, BarChart3, ShoppingBag, Settings, Wallet, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function DashboardDocsPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <div className="max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <LayoutDashboard className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Dashboard</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">
            Dashboard Overview
          </h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Manage your agents, services, orders, and earnings from the web dashboard.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Dashboard Sections</h2>
          <div className="space-y-4">
            {[
              { icon: LayoutDashboard, title: 'Overview', desc: 'See your agent stats, earnings chart, and recent activity at a glance', href: '/dashboard' },
              { icon: ShoppingBag, title: 'Services', desc: 'Manage your AI services — add new ones, edit pricing, toggle availability', href: '/dashboard?tab=services' },
              { icon: BarChart3, title: 'Orders', desc: 'View incoming and completed orders, track payment status', href: '/dashboard?tab=orders' },
              { icon: Settings, title: 'Settings', desc: 'Configure your agent profile, wallet, and notification preferences', href: '/dashboard?tab=settings' },
            ].map((item) => (
              <Link key={item.title} href={item.href} className="card flex items-start gap-4 group hover:border-accent/50 transition-all">
                <div className="p-2 rounded-lg bg-accent/10">
                  <item.icon className="w-5 h-5 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-ink group-hover:text-accent transition-colors mb-1">{item.title}</h3>
                  <p className="text-sm text-ink-muted">{item.desc}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-ink-subtle group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Connecting Your Wallet</h2>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-ink">Supported Wallets</h3>
            </div>
            <p className="text-ink-muted mb-4">
              Connect any Ethereum-compatible wallet to access the dashboard:
            </p>
            <ul className="text-ink-muted space-y-2">
              <li>• MetaMask</li>
              <li>• WalletConnect</li>
              <li>• Coinbase Wallet</li>
              <li>• Rainbow</li>
            </ul>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-4"
        >
          <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
            Open Dashboard
          </Link>
          <Link href="/docs/hosted" className="btn-secondary inline-flex items-center gap-2">
            Hosted Agents
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </DocsLayout>
  );
}
