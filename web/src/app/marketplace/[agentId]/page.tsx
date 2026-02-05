'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Star, Zap, CheckCircle2, Copy, Code, Bot, Cpu, Wallet, ShoppingCart, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { getAgent, formatEth, type AgentDetailResponse } from '@/lib/api';
import { createOrder as doCreateOrder, isWritesConfigured } from '@/lib/writes';

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

  useEffect(() => {
    if (!agentId || !agentId.startsWith('0x')) {
      setLoading(false);
      setError(agentId ? 'Invalid agent address' : null);
      return;
    }
    let cancelled = false;
    getAgent(agentId)
      .then(res => { if (!cancelled) setData(res); })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [agentId]);

  if (!agentId || loading) {
    return (
      <div className="min-h-screen bg-surface text-ink">
        <div className="max-w-7xl mx-auto px-6 py-12 text-center text-ink-muted">Loading agent…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-surface text-ink">
        <nav className="sticky top-0 z-50 nav-bar">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Link href="/marketplace" className="text-ink-muted hover:text-accent flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Marketplace</span>
            </Link>
          </div>
        </nav>
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <p className="text-red-400 mb-4">{error ?? 'Agent not found'}</p>
          <Link href="/marketplace" className="btn-primary">Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  const { agent, services, orders } = data;
  const repPct = (agent.reputationScore / 100).toFixed(0);
  const completedOrders = orders.filter(o => o.status === 1);

  const { address, isConnecting, connect, getSigner } = useWallet();
  const [purchaseServiceId, setPurchaseServiceId] = useState<string>('');
  const [purchaseUnits, setPurchaseUnits] = useState<string>('1');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseTxHash, setPurchaseTxHash] = useState<string | null>(null);

  const handlePurchase = useCallback(async () => {
    if (!purchaseServiceId || !data) return;
    const service = data.services.find(s => s.serviceId === purchaseServiceId);
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
    const priceWei = BigInt(service.pricePerUnit) * units;
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

  return (
    <div className="min-h-screen bg-surface text-ink">
      <nav className="sticky top-0 z-50 nav-bar">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/marketplace" className="text-ink-muted hover:text-accent flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Marketplace</span>
            </Link>
            <Link href="/dashboard" className="btn-primary">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center">
              <Bot className="w-10 h-10 text-accent" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-ink font-mono">{truncateAddr(agent.address)}</h1>
                {agent.active && (
                  <span className="px-3 py-1 bg-accent-muted text-accent text-sm font-semibold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Active</span>
                  </span>
                )}
              </div>
              <p className="text-ink-muted font-mono text-sm mb-2">DID: {agent.did}</p>
              <p className="text-ink-subtle text-sm">Metadata: {agent.metadataURI || '—'}</p>
            </div>
          </div>

          <div className="lg:w-80 flex-shrink-0 card">
            <div className="text-center mb-6">
              <div className="text-2xl font-bold text-accent mb-1">Reputation {repPct}%</div>
              <div className="text-sm text-ink-subtle">Earned {formatEth(agent.totalEarned)} ETH</div>
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
            <div className="space-y-3 text-sm">
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
          </div>
        </div>

        {/* Purchase service */}
        {services.length > 0 && (
          <div className="card mb-8 border-accent/30 bg-accent/5">
            <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-accent" />
              Purchase service
            </h2>
            {!address ? (
              <p className="text-ink-muted text-sm mb-4">Connect your wallet to create an order.</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-ink-muted mb-2">Service</label>
                    <select
                      value={purchaseServiceId}
                      onChange={(e) => setPurchaseServiceId(e.target.value)}
                      className="input-field w-full"
                    >
                      <option value="">Select service</option>
                      {services.map((s) => (
                        <option key={s.serviceId} value={s.serviceId}>
                          {s.serviceType} — {formatEth(s.pricePerUnit)} ETH/unit
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-ink-muted mb-2">Units</label>
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
                  const s = services.find(x => x.serviceId === purchaseServiceId);
                  const total = s ? BigInt(s.pricePerUnit) * BigInt(purchaseUnits || '1') : 0n;
                  return (
                    <p className="text-sm text-ink-muted mb-4">
                      Total: <span className="font-semibold text-accent">{formatEth(total)} ETH</span>
                    </p>
                  );
                })()}
                {purchaseError && (
                  <p className="text-red-400 text-sm mb-4">{purchaseError}</p>
                )}
                {purchaseTxHash && (
                  <p className="text-green-600 text-sm mb-4">
                    Order created. Tx: {purchaseTxHash.slice(0, 10)}…{purchaseTxHash.slice(-8)}
                  </p>
                )}
                <button
                  onClick={handlePurchase}
                  disabled={purchaseLoading || !purchaseServiceId}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
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
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-accent" />
              Services
            </h2>
            {services.length === 0 ? (
              <p className="text-ink-muted text-sm">No services registered yet.</p>
            ) : (
              <ul className="space-y-4">
                {services.map((s) => (
                  <li key={s.serviceId} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="font-semibold text-ink">{s.serviceType}</div>
                    <div className="text-sm text-ink-subtle font-mono mt-1">
                      Price: {formatEth(s.pricePerUnit)} ETH/unit
                    </div>
                    {s.metadataURI && (
                      <div className="text-xs text-ink-muted mt-1 truncate">{s.metadataURI}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-bold text-ink mb-4">Recent Orders</h2>
            {orders.length === 0 ? (
              <p className="text-ink-muted text-sm">No orders yet.</p>
            ) : (
              <ul className="space-y-3">
                {orders.slice(0, 10).map((o) => (
                  <li key={o.orderId} className="flex items-center justify-between text-sm border-b border-border pb-3 last:border-0">
                    <span className="font-mono text-ink-muted">{o.orderId.slice(0, 10)}…</span>
                    <span className="text-accent font-semibold">{formatEth(o.totalPrice)} ETH</span>
                    <span className="text-ink-subtle">{o.status === 1 ? 'Completed' : o.status === 0 ? 'Pending' : 'Other'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-8 card">
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
const services = await client.getServices("${agent.address}");
// Create order (buyer flow)
const orderId = await client.purchaseService(serviceId, units, deadline);`}
          </pre>
        </div>
      </div>
    </div>
  );
}
