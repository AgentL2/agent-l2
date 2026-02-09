'use client';

import { useState } from 'react';
import {
  Copy, CheckCircle2, Wallet, Bell, Shield, Code,
  ExternalLink, LogOut, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/contexts/WalletContext';
import type { AgentDetailResponse } from '@/lib/api';

interface SettingsPanelProps {
  address: string;
  agentData: AgentDetailResponse | null;
}

export default function SettingsPanel({ address, agentData }: SettingsPanelProps) {
  const { disconnect } = useWallet();
  const [copied, setCopied] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2 text-ink">Settings</h2>
        <p className="text-ink-muted">Manage your wallet, agent configuration, and preferences</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Wallet Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
              <Wallet className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Wallet</h3>
              <p className="text-sm text-ink-muted">Connected account details</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-ink-muted mb-2">Address</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="input-field flex-1 font-mono text-sm"
                  value={address}
                  readOnly
                />
                <button
                  onClick={copyAddress}
                  className="btn-ghost p-3 shrink-0"
                  title="Copy address"
                >
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <button
                onClick={disconnect}
                className="btn-ghost w-full justify-center text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Agent Profile */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Agent Profile</h3>
              <p className="text-sm text-ink-muted">On-chain agent configuration</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-ink-muted mb-2">DID</label>
              <input
                type="text"
                className="input-field font-mono text-sm"
                value={agentData?.agent?.did ?? '—'}
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm text-ink-muted mb-2">Metadata URI</label>
              <input
                type="text"
                className="input-field font-mono text-sm"
                value={agentData?.agent?.metadataURI ?? '—'}
                readOnly
              />
            </div>
            <p className="text-xs text-ink-subtle">
              Agent configuration is stored on-chain. Use the SDK to update.
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
              <Bell className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Notifications</h3>
              <p className="text-sm text-ink-muted">Order and activity alerts</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">Browser notifications</p>
                <p className="text-sm text-ink-muted">Get notified of new orders</p>
              </div>
              <button
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-accent' : 'bg-surface-muted'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'left-7' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="pt-4 border-t border-border text-sm text-ink-subtle">
              More notification options coming soon (email, webhooks, Discord).
            </div>
          </div>
        </div>

        {/* Developer Settings */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
              <Code className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Developer</h3>
              <p className="text-sm text-ink-muted">SDK and API configuration</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/docs/quickstart"
              className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-muted transition-colors group"
            >
              <span className="text-ink group-hover:text-accent transition-colors">SDK Quick Start</span>
              <ChevronRight className="w-4 h-4 text-ink-subtle" />
            </Link>
            <Link
              href="/docs/api"
              className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-muted transition-colors group"
            >
              <span className="text-ink group-hover:text-accent transition-colors">API Reference</span>
              <ChevronRight className="w-4 h-4 text-ink-subtle" />
            </Link>
            <a
              href="https://github.com/AgentL2/agent-l2"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-lg bg-surface hover:bg-surface-muted transition-colors group"
            >
              <span className="text-ink group-hover:text-accent transition-colors">GitHub Repository</span>
              <ExternalLink className="w-4 h-4 text-ink-subtle" />
            </a>
          </div>
        </div>

        {/* Autonomous Execution */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ink">Autonomous Execution</h3>
              <p className="text-sm text-ink-muted">Configure automatic order processing</p>
            </div>
          </div>

          <p className="text-ink-muted text-sm mb-4">
            Status: <span className="text-ink-subtle font-medium">Not configured</span>. Orders are created on-chain; configure a worker or hosted agent to complete them automatically.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard?tab=hosted" className="btn-secondary">
              Deploy Hosted Agent
            </Link>
            <Link href="/docs/autonomous-agents" className="btn-ghost">
              Learn More →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
