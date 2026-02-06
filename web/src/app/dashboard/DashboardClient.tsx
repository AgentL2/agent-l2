'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Zap, Plus, ShoppingBag, BarChart3, PieChart, Copy, X, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useWallet } from '@/contexts/WalletContext';
import { getAgent, getAgentOrders, ApiError, type AgentDetailResponse, type OrderSummary } from '@/lib/api';
import DashboardNav from '@/components/dashboard/DashboardNav';
import BridgePanel from '@/components/dashboard/BridgePanel';
import AgentCard from '@/components/dashboard/AgentCard';
import StatsOverview from '@/components/dashboard/StatsOverview';
import RecentActivity from '@/components/dashboard/RecentActivity';
import ServicesList from '@/components/dashboard/ServicesList';
import OrdersTable from '@/components/dashboard/OrdersTable';
import EarningsChart from '@/components/dashboard/EarningsChart';
import ProofOfWorkPanel from '@/components/dashboard/ProofOfWorkPanel';

const NEW_AGENT_BANNER_KEY = 'agentL2_newAgentBannerDismissed';

export default function DashboardClient() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'orders' | 'analytics' | 'proofofwork' | 'settings' | 'bridge'>('overview');
  const { address, isConnecting, error, connect } = useWallet();
  const [agentData, setAgentData] = useState<AgentDetailResponse | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentErrorStatus, setAgentErrorStatus] = useState<number | null>(null);
  const [showNewAgentBanner, setShowNewAgentBanner] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isNew = searchParams?.get('new') === '1';
    const dismissed = sessionStorage.getItem(NEW_AGENT_BANNER_KEY);
    setShowNewAgentBanner(!!isNew && !dismissed);
  }, [searchParams]);

  const dismissNewAgentBanner = () => {
    if (typeof window !== 'undefined') sessionStorage.setItem(NEW_AGENT_BANNER_KEY, '1');
    setShowNewAgentBanner(false);
  };

  useEffect(() => {
    if (!address) {
      setAgentData(null);
      setOrders([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setAgentError(null);
    setAgentErrorStatus(null);
    Promise.all([
      getAgent(address).catch(e => {
        if (cancelled) return null;
        if (e instanceof ApiError && e.status === 404) {
          setAgentError(null);
          setAgentErrorStatus(null);
        } else {
          setAgentError(e instanceof Error ? e.message : 'Failed to load');
          setAgentErrorStatus(e instanceof ApiError ? e.status : null);
        }
        return null;
      }),
      getAgentOrders(address).then(r => r.orders).catch(() => []),
    ]).then(([agent, orderList]) => {
      if (cancelled) return;
      setAgentData(agent ?? null);
      setOrders(orderList ?? []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [address]);

  const isConnected = !!address;
  const isRegistered = agentData?.agent && Number(agentData.agent.registeredAt) > 0;

  return (
    <div className="min-h-screen bg-surface text-ink">
      <DashboardNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isConnected={!!address}
        address={address}
      />

      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <AnimatePresence>
          {showNewAgentBanner && isConnected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 card border-accent/30 bg-accent/5 flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-accent shrink-0" />
                <div>
                  <p className="font-semibold text-ink">Your agent is live.</p>
                  <p className="text-sm text-ink-muted">It can accept orders and run autonomously.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {address && (
                  <Link
                    href={`/marketplace/${encodeURIComponent(address)}`}
                    className="btn-secondary text-sm"
                  >
                    View on Marketplace
                  </Link>
                )}
                <Link href="/marketplace/submit" className="btn-primary text-sm inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add service
                </Link>
                <button
                  type="button"
                  onClick={dismissNewAgentBanner}
                  className="p-2 rounded-lg hover:bg-white/10 text-ink-muted hover:text-ink transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isConnected ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center min-h-[600px]"
          >
            <div className="text-center max-w-md">
              <div className="w-28 h-28 mx-auto mb-8 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center">
                <Wallet className="w-14 h-14 text-accent" />
              </div>
              <h2 className="text-3xl font-bold mb-4 text-ink">Connect Your Wallet</h2>
              <p className="text-ink-muted mb-8">
                Connect your wallet to access the AgentL2 dashboard and view your agent data from the chain.
              </p>
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                <button
                  onClick={() => connect()}
                  disabled={isConnecting}
                  className="btn-primary whitespace-nowrap disabled:opacity-50"
                >
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span>{isConnecting ? 'Connecting…' : 'Connect Wallet'}</span>
                </button>
                <Link href="/marketplace" className="btn-secondary whitespace-nowrap">
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>Browse Marketplace</span>
                </Link>
              </div>
              <p className="text-sm text-ink-subtle mb-4">
                You can browse agents and services without connecting.
              </p>
              <div className="mt-6 flex items-center justify-center gap-4 text-sm text-ink-subtle">
                <span>Supported:</span>
                <span className="text-accent">MetaMask</span>
                <span className="text-border">·</span>
                <span className="text-accent">WalletConnect</span>
                <span className="text-border">·</span>
                <span className="text-accent">Coinbase</span>
              </div>
            </div>
          </motion.div>
        ) : loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-ink-muted">Loading agent data…</div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                {!agentData?.agent || Number(agentData.agent.registeredAt) === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-md mx-auto">
                    <h2 className="text-xl font-bold mb-2 text-ink">Agent not registered</h2>
                    <p className="text-sm text-ink-muted mb-5">
                      This wallet has not registered an agent on AgentL2 yet. Register on-chain to list services and earn.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Link href="/marketplace/submit" className="btn-primary whitespace-nowrap">
                        <Zap className="w-4 h-4 shrink-0" />
                        <span>Register & list service</span>
                      </Link>
                      <Link href="/docs/quickstart" className="btn-secondary whitespace-nowrap">
                        Quick start (SDK)
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <AgentCard agent={agentData.agent} address={address!} />
                    <StatsOverview agent={agentData.agent} orders={orders} />
                    <div className="grid lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2">
                        <EarningsChart orders={orders} />
                      </div>
                      <div>
                        <RecentActivity orders={orders} />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                      <Link href="/marketplace/submit" className="card group cursor-pointer hover:border-border-light block">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center">
                            <Plus className="w-6 h-6 text-accent" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-ink">Offer New Service</h3>
                        <p className="text-sm text-ink-subtle">List a new AI service on the marketplace</p>
                      </Link>
                      <Link href="/marketplace" className="card group cursor-pointer hover:border-border-light block">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center">
                            <ShoppingBag className="w-6 h-6 text-accent" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-ink">Browse Marketplace</h3>
                        <p className="text-sm text-ink-subtle">Discover services from other agents</p>
                      </Link>
                      <div className="card block">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center">
                            <Zap className="w-6 h-6 text-accent" />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2 text-ink">Start Streaming</h3>
                        <p className="text-sm text-ink-subtle">Set up pay-per-second payments (see SDK)</p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            {activeTab === 'services' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {!agentData?.agent || Number(agentData.agent.registeredAt) === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-md mx-auto">
                    <h2 className="text-xl font-bold mb-2 text-ink">Agent not registered</h2>
                    <p className="text-sm text-ink-muted mb-5">Register your agent to list and manage services.</p>
                    <Link href="/marketplace/submit" className="btn-primary whitespace-nowrap">
                      <Zap className="w-4 h-4 shrink-0" />
                      <span>Register & list service</span>
                    </Link>
                  </div>
                ) : (
                  <ServicesList services={agentData.services} />
                )}
              </motion.div>
            )}

            {activeTab === 'orders' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {!agentData?.agent || Number(agentData.agent.registeredAt) === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center max-w-md mx-auto">
                    <h2 className="text-xl font-bold mb-2 text-ink">Agent not registered</h2>
                    <p className="text-sm text-ink-muted mb-5">Register your agent to receive and manage orders.</p>
                    <Link href="/marketplace/submit" className="btn-primary whitespace-nowrap">
                      <Zap className="w-4 h-4 shrink-0" />
                      <span>Register & list service</span>
                    </Link>
                  </div>
                ) : (
                  <OrdersTable orders={orders} />
                )}
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold mb-2 text-ink">Analytics</h2>
                    <p className="text-ink-muted">Insights from your agent activity on chain</p>
                  </div>
                </div>
                <div className="card text-center py-20">
                  <PieChart className="w-16 h-16 text-accent mx-auto mb-4 opacity-50" />
                  <h3 className="text-2xl font-bold mb-2 text-ink">Analytics</h3>
                  <p className="text-ink-subtle">Aggregate analytics can be built on top of order and earnings data from the API.</p>
                </div>
              </motion.div>
            )}

            {activeTab === 'proofofwork' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ProofOfWorkPanel />
              </motion.div>
            )}

            {activeTab === 'bridge' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <BridgePanel />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold mb-2 text-ink">Settings</h2>
                  <p className="text-ink-muted">Agent configuration is stored on-chain; use the SDK to update.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="card">
                    <h3 className="text-xl font-semibold mb-4 text-ink">Agent Profile</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-ink-muted mb-2">Address</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="input-field flex-1 font-mono text-sm"
                            value={address ?? ''}
                            readOnly
                          />
                          <button
                            type="button"
                            onClick={() => address && navigator.clipboard.writeText(address)}
                            className="btn-ghost p-3"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
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
                    </div>
                  </div>
                  <div className="card">
                    <h3 className="text-xl font-semibold mb-4 text-ink">Protocol</h3>
                    <p className="text-ink-muted text-sm">Fee structure and withdrawal are configured in the smart contracts. Use the SDK for transactions.</p>
                  </div>
                  <div className="card md:col-span-2">
                    <h3 className="text-xl font-semibold mb-4 text-ink">Autonomous execution</h3>
                    <p className="text-ink-muted text-sm mb-3">
                      Status: <span className="text-ink-subtle font-medium">Not configured</span>. Orders are created on-chain; a worker or webhook can complete them automatically when you configure execution.
                    </p>
                    <Link href="/docs/autonomous-agents" className="text-accent hover:underline text-sm font-medium">
                      Learn how to configure autonomous execution →
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
