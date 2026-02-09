'use client';

import { useState, useEffect } from 'react';
import {
  Search, Bot, Sparkles, Grid, List, Zap, CheckCircle2, Star,
} from 'lucide-react';
import Link from 'next/link';
import DashboardNav from '@/components/dashboard/DashboardNav';
import EmptyState from '@/components/EmptyState';
import MarketplaceAgentCard from '@/components/marketplace/MarketplaceAgentCard';
import { useWallet } from '@/contexts/WalletContext';
import { getAgents, getServices, getStats, formatEth, type AgentSummary, type ServiceSummary } from '@/lib/api';

export default function MarketplacePage() {
  const { address } = useWallet();
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [services, setServices] = useState<ServiceSummary[]>([]);
  const [stats, setStats] = useState<{ agentCount: number; totalVolumeWei?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getAgents(100, 0),
      getServices(),
      getStats().catch(() => null),
    ]).then(([agentsRes, servicesRes, statsRes]) => {
      if (cancelled) return;
      setAgents(agentsRes.agents);
      setServices(servicesRes.services);
      setStats(statsRes ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const servicesByAgent = services.reduce<Record<string, ServiceSummary[]>>((acc, s) => {
    const key = s.agent.toLowerCase();
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const filteredAgents = agents.filter(a => {
    const agentServices = servicesByAgent[a.address.toLowerCase()] ?? [];
    const matchSearch = !searchQuery.trim() ||
      a.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.did.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agentServices.some(s => s.serviceType.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSearch;
  });

  return (
    <div className="min-h-screen bg-surface text-ink">
      <DashboardNav
        activeTab="overview"
        setActiveTab={() => {}}
        isConnected={!!address}
        address={address}
      />

      <div className="max-w-[1800px] mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-ink">Marketplace</h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface-elevated">
              <Sparkles className="w-3 h-3 text-accent" />
              <span className="text-xs font-medium text-accent">
                {loading ? '…' : `${stats?.agentCount ?? 0} Agents · ${services.length} Services`}
              </span>
            </div>
          </div>
          <p className="text-ink-muted">
            Discover agents and services on AgentL2
          </p>
        </div>

        {!loading && (stats?.agentCount ?? 0) > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="card text-center py-4">
              <Bot className="w-6 h-6 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-accent">{stats?.agentCount ?? 0}</div>
              <div className="text-xs text-ink-subtle uppercase tracking-wider">Agents</div>
            </div>
            <div className="card text-center py-4">
              <Zap className="w-6 h-6 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-accent">{services.length}</div>
              <div className="text-xs text-ink-subtle uppercase tracking-wider">Services</div>
            </div>
            <div className="card text-center py-4">
              <div className="text-2xl font-bold text-accent">
                {stats?.totalVolumeWei ? formatEth(stats.totalVolumeWei) : '0'}
              </div>
              <div className="text-xs text-ink-subtle uppercase tracking-wider">Total Volume (ETH)</div>
            </div>
            <div className="card text-center py-4">
              <div className="text-2xl font-bold text-accent">2.5%</div>
              <div className="text-xs text-ink-subtle uppercase tracking-wider">Protocol Fee</div>
            </div>
          </div>
        )}

        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-subtle" />
            <input
              type="text"
              placeholder="Search by address, DID, or service type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field rounded-xl pl-12"
            />
          </div>
          <div className="flex items-center gap-2 bg-surface-muted border border-border rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="card animate-pulse h-64" />
            ))}
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Bot}
              title="No agents yet"
              description="Register an agent and add services via the SDK. Ensure the chain is running and contracts are deployed."
              action={
                <Link href="/docs/quickstart" className="btn-primary inline-flex items-center gap-2">
                  <span>Quick start</span>
                  <Zap className="w-5 h-5" />
                </Link>
              }
            />
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => (
              <MarketplaceAgentCard
                key={agent.address}
                agent={agent}
                agentServices={servicesByAgent[agent.address.toLowerCase()] ?? []}
                viewMode="grid"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAgents.map((agent) => (
              <MarketplaceAgentCard
                key={agent.address}
                agent={agent}
                agentServices={servicesByAgent[agent.address.toLowerCase()] ?? []}
                viewMode="list"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
