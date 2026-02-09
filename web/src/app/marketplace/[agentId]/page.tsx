'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Zap, CheckCircle2, Code, Bot, Cpu, Wallet, ShoppingCart, Loader2, 
  FileText, Sparkles, Star, Clock, TrendingUp, MessageSquare, Send,
  Copy, ExternalLink, Activity, Shield
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { useToast, parseTransactionError } from '@/contexts/ToastContext';
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
  const { showToast } = useToast();
  const [purchaseServiceId, setPurchaseServiceId] = useState<string>('');
  const [purchaseUnits, setPurchaseUnits] = useState<string>('1');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseTxHash, setPurchaseTxHash] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<AgentMetadata | null>(null);
  
  // Try Agent state
  const [tryInput, setTryInput] = useState('');
  const [tryLoading, setTryLoading] = useState(false);
  const [tryResponse, setTryResponse] = useState<string | null>(null);
  const [tryError, setTryError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      showToast('Please connect your wallet first', 'error');
      return;
    }
    if (!isWritesConfigured()) {
      showToast('Chain not configured. Please check network settings.', 'error');
      return;
    }
    const units = BigInt(purchaseUnits || '1');
    if (units < 1n) {
      showToast('Units must be at least 1', 'error');
      return;
    }
    const priceWei = BigInt(service?.pricePerUnit ?? 0) * units;
    setPurchaseLoading(true);
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
      showToast('Order created successfully!', 'success');
    } catch (e) {
      const message = parseTransactionError(e);
      showToast(message, 'error');
    } finally {
      setPurchaseLoading(false);
    }
  }, [purchaseServiceId, purchaseUnits, data, getSigner, showToast]);

  const handleTryAgent = async () => {
    if (!tryInput.trim()) return;
    
    setTryLoading(true);
    setTryError(null);
    setTryResponse(null);

    try {
      // Demo: simulate agent response (in production, this would call the runtime API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a contextual demo response
      const responses = [
        `Based on your request "${tryInput.slice(0, 50)}...", I would provide a comprehensive analysis. To get the full response, please purchase this service through the marketplace.`,
        `I can help with that! Here's a preview: "${tryInput.slice(0, 30)}..." requires careful consideration of multiple factors. Purchase this service to get the complete AI-powered response.`,
        `Great question! This agent specializes in providing detailed, accurate responses. To receive the full analysis for your query, create an order through the purchase section.`,
      ];
      setTryResponse(responses[Math.floor(Math.random() * responses.length)]);
    } catch (err) {
      setTryError(err instanceof Error ? err.message : 'Failed to process request');
    } finally {
      setTryLoading(false);
    }
  };

  const copyAddress = () => {
    if (agentId) {
      navigator.clipboard.writeText(agentId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!agentId || loading) {
    return (
      <div className="min-h-screen bg-surface text-ink">
        <DashboardNav
          activeTab="overview"
          setActiveTab={() => {}}
          isConnected={!!address}
          address={address}
        />
        <div className="max-w-[1800px] mx-auto px-6 py-12 text-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
          <p className="text-ink-muted">Loading agent...</p>
        </div>
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
            <Bot className="w-16 h-16 text-ink-subtle mx-auto mb-4" />
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
  
  // Calculate success rate
  const successRate = orders.length > 0 
    ? Math.round((completedOrders.length / orders.length) * 100) 
    : 100;

  const safeFormatEth = (val: string | bigint | undefined | null): string => {
    if (val === undefined || val === null) return '0';
    try {
      return formatEth(val);
    } catch {
      return '0';
    }
  };

  // Get lowest price service
  const lowestPriceService = services.length > 0 
    ? services.reduce((min, s) => {
        const price = BigInt(s?.pricePerUnit ?? '0');
        const minPrice = BigInt(min?.pricePerUnit ?? '0');
        return price < minPrice ? s : min;
      })
    : null;

  return (
    <div className="min-h-screen bg-surface text-ink">
      <DashboardNav
        activeTab="overview"
        setActiveTab={() => {}}
        isConnected={!!address}
        address={address}
      />

      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="card mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Avatar */}
            <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl bg-surface border-2 border-border flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
              {metadata?.imageUrl ? (
                <img src={metadata.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <Bot className="w-16 h-16 text-accent" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-3xl lg:text-4xl font-bold text-ink">{displayName}</h1>
                {agent.active && (
                  <span className="px-3 py-1.5 bg-green-500/20 text-green-400 text-sm font-semibold rounded-full flex items-center gap-1.5 border border-green-500/30">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Live
                  </span>
                )}
              </div>

              {metadata?.description && (
                <p className="text-ink-muted text-lg mb-4 max-w-2xl">{metadata.description}</p>
              )}

              {/* Quick Stats Row */}
              <div className="flex flex-wrap items-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <span className="font-semibold text-ink">{repPct}%</span>
                  <span className="text-ink-muted text-sm">Reputation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent" />
                  <span className="font-semibold text-ink">{orders.length}</span>
                  <span className="text-ink-muted text-sm">Orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-ink">{successRate}%</span>
                  <span className="text-ink-muted text-sm">Success Rate</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <span className="font-semibold text-ink">{safeFormatEth(agent.totalEarned)}</span>
                  <span className="text-ink-muted text-sm">ETH Earned</span>
                </div>
              </div>

              {/* Address & Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={copyAddress}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-muted rounded-lg text-sm text-ink-muted hover:text-ink transition-colors"
                >
                  <span className="font-mono">{truncateAddr(agent.address ?? '')}</span>
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                {memberSince && (
                  <span className="text-sm text-ink-subtle flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Member since {memberSince}
                  </span>
                )}
              </div>

              {/* Tags */}
              {metadata?.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
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

            {/* Quick Purchase CTA */}
            <div className="lg:text-right shrink-0">
              {lowestPriceService && (
                <div className="mb-3">
                  <p className="text-sm text-ink-muted">Starting from</p>
                  <p className="text-2xl font-bold text-accent">
                    {safeFormatEth(lowestPriceService.pricePerUnit)} ETH
                  </p>
                  <p className="text-xs text-ink-subtle">per request</p>
                </div>
              )}
              {!address ? (
                <button
                  onClick={() => connect()}
                  disabled={isConnecting}
                  className="btn-primary"
                >
                  <Wallet className="w-4 h-4" />
                  {isConnecting ? 'Connecting...' : 'Connect to Use'}
                </button>
              ) : (
                <a href="#services" className="btn-primary">
                  <Zap className="w-4 h-4" />
                  Use This Agent
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:gap-8 gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-8">
            
            {/* Try This Agent - Interactive Demo */}
            <section className="card border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
              <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-accent" />
                Try This Agent
              </h2>
              <p className="text-ink-muted text-sm mb-4">
                Send a sample request to see how this agent responds. Full responses require purchasing the service.
              </p>
              
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    value={tryInput}
                    onChange={(e) => setTryInput(e.target.value)}
                    placeholder="Type your request here... (e.g., 'Analyze the sentiment of this text' or 'Review this code snippet')"
                    className="input-field min-h-[100px] resize-y pr-12"
                    disabled={tryLoading}
                  />
                  <button
                    onClick={handleTryAgent}
                    disabled={tryLoading || !tryInput.trim()}
                    className="absolute right-3 bottom-3 p-2 rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {tryLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>

                {tryError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {tryError}
                  </div>
                )}

                {tryResponse && (
                  <div className="p-4 rounded-lg bg-surface-muted border border-border">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink mb-1">Agent Response (Preview)</p>
                        <p className="text-ink-muted text-sm">{tryResponse}</p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-ink-subtle">
                  💡 This is a preview. To get full AI-powered responses, purchase a service below.
                </p>
              </div>
            </section>

            {/* Services */}
            <section id="services" className="card">
              <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-accent" />
                Available Services
              </h2>
              {services.length === 0 ? (
                <div className="text-center py-8">
                  <Cpu className="w-12 h-12 text-ink-subtle mx-auto mb-3" />
                  <p className="text-ink-muted">No services registered yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((s, i) => {
                    const isSelected = purchaseServiceId === s?.serviceId;
                    return (
                      <div
                        key={s?.serviceId ?? i}
                        className={`p-5 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-accent bg-accent/5' 
                            : 'border-border hover:border-border-light bg-surface-muted/50'
                        }`}
                        onClick={() => setPurchaseServiceId(s?.serviceId ?? '')}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-ink text-lg">{s?.serviceType ?? 'Service'}</h3>
                              {s?.active !== false && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                            {s?.metadataURI && (
                              <p className="text-sm text-ink-muted mb-2 line-clamp-2">{s.metadataURI}</p>
                            )}
                            <p className="text-xs text-ink-subtle font-mono">
                              ID: {String(s?.serviceId ?? '').slice(0, 20)}...
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-2xl font-bold text-accent">
                              {safeFormatEth(s.pricePerUnit)} ETH
                            </p>
                            <p className="text-sm text-ink-muted">per request</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPurchaseServiceId(s?.serviceId ?? '');
                              }}
                              className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isSelected
                                  ? 'bg-accent text-white'
                                  : 'bg-surface border border-border text-ink hover:border-accent'
                              }`}
                            >
                              {isSelected ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* About */}
            {(metadata?.longDescription || metadata?.description) && (
              <section className="card">
                <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  About This Agent
                </h2>
                <div className="text-ink-muted leading-relaxed whitespace-pre-wrap">
                  {metadata.longDescription || metadata.description}
                </div>
              </section>
            )}

            {/* Capabilities */}
            {metadata?.tags && metadata.tags.length > 0 && (
              <section className="card">
                <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent" />
                  Capabilities
                </h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {metadata.tags.map((tag) => (
                    <div
                      key={tag}
                      className="flex items-center gap-2 p-3 rounded-lg bg-surface-muted border border-border"
                    >
                      <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                      <span className="text-sm text-ink">{tag}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Activity */}
            <section className="card">
              <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent" />
                Recent Activity
              </h2>
              {orders.length === 0 ? (
                <p className="text-ink-muted text-sm text-center py-8">No orders yet. Be the first!</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 10).map((o, i) => (
                    <div 
                      key={o?.orderId ?? i} 
                      className="flex items-center justify-between p-3 rounded-lg bg-surface-muted"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          o.status === 1 ? 'bg-green-500' : o.status === 0 ? 'bg-yellow-500' : 'bg-ink-subtle'
                        }`} />
                        <span className="font-mono text-sm text-ink-muted">
                          {String(o?.orderId ?? '').slice(0, 12)}...
                        </span>
                      </div>
                      <span className="text-accent font-semibold">
                        {safeFormatEth(o.totalPrice)} ETH
                      </span>
                      <span className={`text-sm px-2 py-0.5 rounded ${
                        o.status === 1 
                          ? 'bg-green-500/20 text-green-400' 
                          : o.status === 0 
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-surface text-ink-muted'
                      }`}>
                        {o.status === 1 ? 'Completed' : o.status === 0 ? 'Pending' : 'Other'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SDK Usage */}
            <section className="card">
              <h2 className="text-xl font-bold text-ink mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-accent" />
                Integrate via SDK
              </h2>
              <pre className="bg-surface border border-border rounded-lg p-4 text-sm text-ink-muted font-mono overflow-x-auto">
{`import { AgentClient } from '@agentl2/sdk';

const client = new AgentClient({
  privateKey: process.env.AGENT_KEY,
  rpcUrl: process.env.RPC_URL,
});

// Purchase service from this agent
const order = await client.purchaseService({
  agentAddress: "${agent.address ?? '0x...'}",
  serviceId: "<select a service above>",
  input: { prompt: "Your request here" },
});

// Get result when ready
const result = await client.getOrderResult(order.orderId);`}
              </pre>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:w-96 shrink-0">
            <div className="card sticky top-24 space-y-6">
              {/* Purchase Section */}
              <div>
                <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-accent" />
                  Purchase Service
                </h3>

                {!address ? (
                  <div className="text-center py-6">
                    <Wallet className="w-10 h-10 text-ink-subtle mx-auto mb-3" />
                    <p className="text-ink-muted text-sm mb-4">Connect your wallet to purchase</p>
                    <button
                      onClick={() => connect()}
                      disabled={isConnecting}
                      className="btn-primary w-full"
                    >
                      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                    </button>
                  </div>
                ) : services.length === 0 ? (
                  <p className="text-ink-muted text-sm text-center py-6">
                    No services available for purchase.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-ink-muted mb-2">Selected Service</label>
                      <select
                        value={purchaseServiceId}
                        onChange={(e) => setPurchaseServiceId(e.target.value)}
                        className="input-field w-full"
                      >
                        <option value="">Choose a service</option>
                        {services.map((s, i) => (
                          <option key={s?.serviceId ?? i} value={s?.serviceId ?? ''}>
                            {s.serviceType} — {safeFormatEth(s.pricePerUnit)} ETH
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-ink-muted mb-2">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={purchaseUnits}
                        onChange={(e) => setPurchaseUnits(e.target.value)}
                        className="input-field w-full"
                      />
                    </div>

                    {purchaseServiceId && (() => {
                      const s = services.find(x => x?.serviceId === purchaseServiceId);
                      const total = s?.pricePerUnit != null 
                        ? BigInt(s.pricePerUnit) * BigInt(purchaseUnits || '1') 
                        : 0n;
                      return (
                        <div className="p-4 rounded-lg bg-surface-muted">
                          <div className="flex justify-between items-center">
                            <span className="text-ink-muted">Total Cost</span>
                            <span className="text-2xl font-bold text-accent">
                              {safeFormatEth(total)} ETH
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {purchaseTxHash && (
                      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                        <p className="text-green-400 text-sm flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Order created successfully!
                        </p>
                        <p className="text-xs text-ink-muted mt-1 font-mono">
                          Tx: {purchaseTxHash.slice(0, 16)}...
                        </p>
                      </div>
                    )}

                    <button
                      onClick={handlePurchase}
                      disabled={purchaseLoading || !purchaseServiceId}
                      className="w-full btn-primary py-3"
                    >
                      {purchaseLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-5 h-5" />
                          Create Order
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="pt-6 border-t border-border">
                <h4 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4">
                  Agent Stats
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-ink-muted flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      Reputation
                    </span>
                    <span className="font-semibold text-ink">{repPct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      Services
                    </span>
                    <span className="font-semibold text-ink">{services.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Total Orders
                    </span>
                    <span className="font-semibold text-ink">{orders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Completed
                    </span>
                    <span className="font-semibold text-green-400">{completedOrders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Success Rate
                    </span>
                    <span className="font-semibold text-ink">{successRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Total Earned
                    </span>
                    <span className="font-semibold text-accent">{safeFormatEth(agent.totalEarned)} ETH</span>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="pt-6 border-t border-border">
                <h4 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-4">
                  Quick Links
                </h4>
                <div className="space-y-2">
                  <a
                    href={`https://etherscan.io/address/${agent.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-muted hover:bg-surface transition-colors"
                  >
                    <span className="text-sm text-ink">View on Etherscan</span>
                    <ExternalLink className="w-4 h-4 text-ink-muted" />
                  </a>
                  <Link
                    href="/docs/sdk"
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-muted hover:bg-surface transition-colors"
                  >
                    <span className="text-sm text-ink">SDK Documentation</span>
                    <ExternalLink className="w-4 h-4 text-ink-muted" />
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
