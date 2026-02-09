'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Zap, CheckCircle2, Code, Bot, Cpu, Wallet, ShoppingCart, Loader2, FileText, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import DashboardNav from '@/components/dashboard/DashboardNav';
import { getAgent, formatEth, type AgentDetailResponse } from '@/lib/api';
import { createOrder as doCreateOrder, isWritesConfigured } from '@/lib/writes';
import { fetchAgentMetadata, getAgentDisplayName, type AgentMetadata } from '@/lib/agentMetadata';
import { Tooltip, LabelWithTooltip } from '@/components/UI/Tooltip';

function truncateAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = (params?.agentId as string) ?? null;
  const [data, setData] = useState<AgentDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnecting, connect, getSigner } = useWallet();
  const [purchaseServiceId, setPurchaseServiceId] = useState<string>('');
  const [purchaseUnits, setPurchaseUnits] = useState<string>('1');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseTxHash, setPurchaseTxHash] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AgentMetadata | null>(null);

  useEffect(() => {
    if (!agentId || !agentId.startsWith('0x')) {
      setLoading(false);
      setError(agentId ? 'Invalid agent address' : null);
      return;
    }
    let cancelled = false;
    getAgent(agentId)
      .then(res => {
        if (cancelled) return;
        if (res?.agent) setData(res);
        else setError('Invalid response');
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [agentId]);

  useEffect(() => {
    if (!data?.agent?.metadataURI) return;
    let cancelled = false;
    fetchAgentMetadata(data.agent.metadataURI).then((m) => {
      if (!cancelled) setMetadata(m);
    });
    return () => { cancelled = true; };
  }, [data?.agent?.metadataURI]);

  const handlePurchase = useCallback(async () => {
    if (!purchaseServiceId || !data) return;
    const service = data.services?.find((s: { serviceId?: string }) => s?.serviceId === purchaseServiceId);
    if (!service) return;
    const signer = await getSigner();
    if (!signer) {
      setPurchaseError('Connect your wallet first.');
      return;
    }
    if (!isWritesConfigured()) {
      setPurchaseError('Chain not configured.');
      return;
    }
    const units = BigInt(purchaseUnits || '1');
    if (units < 1n) {
      setPurchaseError('Units must be at least 1.');
      return;
    }
    const priceWei = BigInt(service?.pricePerUnit ?? 0) * units;
    setPurchaseLoading(true);
    setPurchaseError(null);
    setPurchaseTxHash(null);
    try {
      const { orderId, txHash } = await doCreateOrder(
        signer,
        purchaseServiceId,
        units,
        3600,
        priceWei
      );
      setPurchaseTxHash(txHash);
      setPurchaseServiceId('');
      setPurchaseUnits('1');
    } catch (e) {
      setPurchaseError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setPurchaseLoading(false);
    }
  }, [purchaseServiceId, purchaseUnits, data, getSigner]);

  if (!agentId || loading) {
    return (
      <div className="min-h-screen bg-surface text-ink">
        <DashboardNav
          activeTab="overview"
          setActiveTab={() => {}}
          isConnected={!!address}
          address={address}
        />
        <div className="max-w-[1800px] mx-auto px-6 py-12 text-center text-ink-muted">Loading agent…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-surface text-ink">
        <DashboardNav
          activeTab="overview"
          setActiveTab={() => {}}
          isConnected={!!address}
          address={address}
        />
        <div className="max-w-[1800px] mx-auto px-6 py-8">
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error ?? 'Agent not found'}</p>
            <Link href="/marketplace" className="btn-primary">Go to Marketplace</Link>
          </div>
        </div>
      </div>
    );
  }

  const agent = data.agent ?? {};
  const services = Array.isArray(data.services) ? data.services : [];
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const repNum = Number(agent.reputationScore ?? 0) / 100;
  const repPct = Number.isNaN(repNum) ? '0' : String(Math.floor(repNum));
  const completedOrders = orders.filter((o: { status?: number }) => Number(o?.status) === 1);
  const displayName = metadata ? getAgentDisplayName(metadata, agent.address ?? '') : truncateAddr(agent.address ?? '');
  const memberSince =
    agent.registeredAt && Number(agent.registeredAt) > 0
      ? new Date(Number(agent.registeredAt) * 1000).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
      : null;

  const safeFormatEth = (val: string | bigint | undefined | null): string => {
    if (val === undefined || val === null) return '0';
    try {
      return formatEth(val);
    } catch {
      return '0';
    }
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <DashboardNav
        activeTab="overview"
        setActiveTab={() => {}}
        isConnected={!!address}
        address={address}
      />

      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Hero — ClawHub-style: avatar, name, category, live badge, tagline, meta */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface-elevated border-2 border-border flex items-center justify-center overflow-hidden shrink-0 shadow-card">
              {metadata?.imageUrl ? (
                <img src={metadata.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Bot className="w-14 h-14 sm:w-16 sm:h-16 text-accent" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-3xl sm:text-4xl font-bold text-ink">{displayName}</h1>
                {agent.active && (
                  <span className="px-3 py-1.5 bg-green-500/20 text-green-600 dark:text-green-400 text-sm font-semibold rounded-full flex items-center gap-1.5 border border-green-500/30">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span>Live</span>
                  </span>
                )}
                {metadata?.category && (
                  <span className="px-3 py-1 bg-surface-muted text-ink-muted text-sm font-medium rounded-full border border-border">
                    {metadata.category}
                  </span>
                )}
              </div>
              {metadata?.description && (
                <p className="text-ink-muted text-base mb-3 max-w-2xl leading-relaxed">{metadata.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-subtle">
                {memberSince && <span>Member since {memberSince}</span>}
                <span className="font-mono text-xs">DID: {agent.did ?? '—'}</span>
              </div>
              {metadata?.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {metadata.tags.slice(0, 8).map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium border border-accent/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:gap-10 gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">
            {/* About */}
            {(metadata?.longDescription || metadata?.description) && (
              <section className="card">
                <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  About this agent
                </h2>
                <div className="text-ink-muted leading-relaxed whitespace-pre-wrap max-w-none">
                  {metadata.longDescription && metadata.longDescription.trim() !== metadata.description?.trim()
                    ? metadata.longDescription
                    : metadata.description}
                </div>
              </section>
            )}

            {/* What this agent offers (capabilities from tags) */}
            {metadata?.tags && metadata.tags.length > 0 && (
              <section className="card">
                <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  What this agent offers
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {metadata.tags.map((tag) => (
                    <li key={tag}>
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-surface-muted border border-border text-sm text-ink">
                        {tag}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Services as cards */}
            <section className="card">
              <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-accent" />
                Services
              </h2>
              {services.length === 0 ? (
                <p className="text-ink-muted text-sm">No services registered yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {services.map((s, i) => (
                    <div
                      key={s?.serviceId ?? i}
                      className="p-4 rounded-xl border border-border bg-surface-muted/50 hover:border-border-light transition-colors"
                    >
                      <div className="font-semibold text-ink mb-1">{s?.serviceType ?? 'Service'}</div>
                      <div className="text-sm text-accent font-medium mb-2">
                        {safeFormatEth(s.pricePerUnit)} ETH per unit
                      </div>
                      {s?.metadataURI && (
                        <p className="text-xs text-ink-subtle line-clamp-2 break-all">{s.metadataURI}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Orders */}
            <section className="card">
              <h2 className="text-xl font-bold text-ink mb-4">Recent orders</h2>
              {orders.length === 0 ? (
                <p className="text-ink-muted text-sm">No orders yet.</p>
              ) : (
                <ul className="space-y-3">
                  {orders.slice(0, 10).map((o, i) => (
                    <li key={o?.orderId ?? i} className="flex items-center justify-between text-sm border-b border-border pb-3 last:border-0">
                      <span className="font-mono text-ink-muted">{String(o?.orderId ?? '').slice(0, 10)}…</span>
                      <span className="text-accent font-semibold">{safeFormatEth(o.totalPrice)} ETH</span>
                      <span className="text-ink-subtle">{o.status === 1 ? 'Completed' : o.status === 0 ? 'Pending' : 'Other'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* SDK usage */}
            <section className="card">
              <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-accent" />
                SDK usage
              </h2>
              <pre className="bg-surface-muted border border-border rounded-lg p-4 text-sm text-ink-muted font-mono overflow-x-auto">
{`import { AgentClient } from '@agentl2/sdk';

const client = new AgentClient({
  privateKey: process.env.AGENT_KEY,
  rpcUrl: process.env.RPC_URL,
  registryAddress: process.env.REGISTRY_ADDRESS,
  marketplaceAddress: process.env.MARKETPLACE_ADDRESS,
});

// Get this agent's services
const services = await client.getServices("${agent.address ?? ''}");
// Create order (buyer flow)
const orderId = await client.purchaseService(serviceId, units, deadline);`}
              </pre>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:w-80 flex-shrink-0 space-y-6">
            <div className="card sticky top-24">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-2xl font-bold text-accent">Reputation {repPct}%</span>
                  <Tooltip content="On-chain reputation score (0–100%). Builds trust with buyers." iconTrigger side="top" />
                </div>
                <div className="text-sm text-ink-subtle">Earned {safeFormatEth(agent.totalEarned)} ETH</div>
              </div>
              {!address ? (
                <button
                  onClick={() => connect()}
                  disabled={isConnecting}
                  className="w-full btn-primary flex items-center justify-center gap-2 mb-4"
                >
                  <Wallet className="w-5 h-5" />
                  <span>{isConnecting ? 'Connecting…' : 'Connect to Purchase'}</span>
                </button>
              ) : (
                <Link href="/dashboard" className="w-full btn-secondary flex items-center justify-center gap-2 mb-4">
                  <Zap className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>
              )}
              <div className="space-y-3 text-sm mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-ink-subtle">Services</span>
                  <span className="font-semibold text-ink">{services.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-subtle">Orders</span>
                  <span className="font-semibold text-ink">{orders.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-subtle">Completed</span>
                  <span className="font-semibold text-ink">{completedOrders.length}</span>
                </div>
              </div>

              {/* Purchase service — in sidebar */}
              {services.length > 0 && (
                <>
                  <h3 className="text-lg font-bold text-ink mb-3 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-accent" />
                    Purchase
                  </h3>
                  {!address ? (
                    <p className="text-ink-muted text-sm mb-4">Connect your wallet to create an order.</p>
                  ) : (
                    <>
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="block text-sm text-ink-muted mb-1">Service</label>
                          <select
                            value={purchaseServiceId}
                            onChange={(e) => setPurchaseServiceId(e.target.value)}
                            className="input-field w-full"
                          >
                            <option value="">Select service</option>
                            {services.map((s, i) => (
                              <option key={s?.serviceId ?? i} value={s?.serviceId ?? ''}>
                                {s.serviceType} — {safeFormatEth(s.pricePerUnit)} ETH/unit
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <LabelWithTooltip
                            label="Units"
                            tooltip="Number of units to purchase. Total cost = price per unit × units."
                          />
                          <input
                            type="number"
                            min={1}
                            value={purchaseUnits}
                            onChange={(e) => setPurchaseUnits(e.target.value)}
                            className="input-field w-full"
                          />
                        </div>
                      </div>
                      {purchaseServiceId && (() => {
                        const s = services.find(x => x?.serviceId === purchaseServiceId);
                        const total = s?.pricePerUnit != null ? BigInt(s.pricePerUnit) * BigInt(purchaseUnits || '1') : 0n;
                        return (
                          <p className="text-sm text-ink-muted mb-3">
                            Total: <span className="font-semibold text-accent">{safeFormatEth(total)} ETH</span>
                          </p>
                        );
                      })()}
                      {purchaseError && (
                        <p className="text-red-400 text-sm mb-3">{purchaseError}</p>
                      )}
                      {purchaseTxHash && (
                        <p className="text-green-600 text-sm mb-3">
                          Order created. Tx: {String(purchaseTxHash).slice(0, 10)}…{String(purchaseTxHash).slice(-8)}
                        </p>
                      )}
                      <button
                        onClick={handlePurchase}
                        disabled={purchaseLoading || !purchaseServiceId}
                        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {purchaseLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Creating order…</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-5 h-5" />
                            <span>Create order</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
