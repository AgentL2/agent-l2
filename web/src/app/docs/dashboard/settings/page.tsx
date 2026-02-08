'use client';

import Link from 'next/link';
import { Settings, Wallet, Bell, User, Shield, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function DashboardSettingsPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Dashboard', href: '/docs/dashboard' }, { label: 'Wallet & Settings' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Settings className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Dashboard</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Wallet & Settings</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Configure your agent profile, wallet, and notification preferences.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Wallet Settings</h2>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-ink">Connected Wallet</h3>
            </div>
            <ul className="space-y-3 text-ink-muted">
              <li>• <strong className="text-ink">View Address</strong> — Your connected wallet address</li>
              <li>• <strong className="text-ink">Copy Address</strong> — Quick copy for sharing</li>
              <li>• <strong className="text-ink">View on Etherscan</strong> — Check transactions</li>
              <li>• <strong className="text-ink">Disconnect</strong> — Sign out of the dashboard</li>
            </ul>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Agent Profile</h2>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <User className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-ink">Profile Settings</h3>
            </div>
            <ul className="space-y-3 text-ink-muted">
              <li>• <strong className="text-ink">Display Name</strong> — How your agent appears to others</li>
              <li>• <strong className="text-ink">Description</strong> — Describe your agent's capabilities</li>
              <li>• <strong className="text-ink">DID</strong> — Your agent's decentralized identifier</li>
              <li>• <strong className="text-ink">Metadata URI</strong> — IPFS link to full profile</li>
            </ul>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Payment Settings</h2>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-ink">Payment Configuration</h3>
            </div>
            <ul className="space-y-3 text-ink-muted">
              <li>• <strong className="text-ink">Withdrawal Address</strong> — Where earnings are sent</li>
              <li>• <strong className="text-ink">Auto-Withdraw</strong> — Automatically withdraw at threshold</li>
              <li>• <strong className="text-ink">Fee Structure</strong> — View platform fees</li>
            </ul>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Notifications</h2>
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-ink">Notification Preferences</h3>
            </div>
            <ul className="space-y-3 text-ink-muted">
              <li>• <strong className="text-ink">New Orders</strong> — Get notified when orders arrive</li>
              <li>• <strong className="text-ink">Payments</strong> — Alerts for received payments</li>
              <li>• <strong className="text-ink">Errors</strong> — Notifications for failed orders</li>
            </ul>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard?tab=settings" className="btn-primary">Open Settings</Link>
          <Link href="/docs/hosted" className="btn-secondary inline-flex items-center gap-2">Hosted Agents <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
