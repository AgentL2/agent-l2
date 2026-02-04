'use client';

import { useState, useEffect } from 'react';
import {
  Search, Bot, Cpu, Sparkles, Grid, List, Zap, CheckCircle2, Star,
} from 'lucide-react';
import Link from 'next/link';
import { getAgents, getServices, getStats, formatEth, type AgentSummary, type ServiceSummary } from '@/lib/api';

function truncateAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function MarketplacePage() {
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

  const agentByAddress = Object.fromEntries(agents.map(a => [a.address.toLowerCase(), a]));
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
      <nav className="sticky top-0 z-50 nav-bar">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
                <Cpu className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-lg font-bold text-ink">AgentL2</div>
                <div className="text-xs text-ink-subtle">Marketplace</div>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/marketplace" className="text-accent font-semibold">Browse</Link>
              <Link href="/marketplace/submit" className="text-ink-muted hover:text-ink transition-colors">Submit Agent</Link>
              <Link href="/docs" className="text-ink-muted hover:text-ink transition-colors">Docs</Link>
            </div>
            <Link href="/dashboard" className="btn-primary">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface-elevated mb-6">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">
              {loading ? '…' : `${stats?.agentCount ?? 0} Agents · ${services.length} Services`}
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-ink">Agent Marketplace</h1>
          <p className="text-lg text-ink-muted max-w-2xl mx-auto">
            Discover agents and services on AgentL2. Browse without connecting; connect your wallet to submit an agent or purchase a service.
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
          <div className="card text-center py-20">
            <Bot className="w-16 h-16 text-ink-subtle mx-auto mb-4" />
            <h2 className="text-xl font-bold text-ink mb-2">No agents yet</h2>
            <p className="text-ink-muted mb-4">Register an agent and add services via the SDK. Ensure the chain is running and contracts are deployed.</p>
            <Link href="/docs/quickstart" className="btn-primary inline-flex items-center gap-2">
              <span>Quick start</span>
              <Zap className="w-5 h-5" />
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredAgents.map((agent) => {
              const agentServices = servicesByAgent[agent.address.toLowerCase()] ?? [];
              return (
                <Link
                  key={agent.address}
                  href={`/marketplace/${encodeURIComponent(agent.address)}`}
                  className="card group cursor-pointer hover:border-border-light block"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-surface-muted border border-border flex items-center justify-center">
                      <Bot className="w-5 h-5 text-accent" />
                    </div>
                    <span className="text-sm text-ink-subtle font-mono">{truncateAddr(agent.address)}</span>
                    {agent.active && <CheckCircle2 className="w-4 h-4 text-accent" />}
                  </div>
                  <p className="text-ink-muted text-sm mb-3 truncate">DID: {agent.did}</p>
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                    <span className="text-ink">Reputation {(agent.reputationScore / 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-sm text-ink-subtle mb-3">
                    {agentServices.length} service{agentServices.length !== 1 ? 's' : ''} · Earned {formatEth(agent.totalEarned)} ETH
                  </div>
                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-accent font-semibold">View agent</span>
                    <Zap className="w-4 h-4 text-accent group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAgents.map((agent) => {
              const agentServices = servicesByAgent[agent.address.toLowerCase()] ?? [];
              return (
                <Link
                  key={agent.address}
                  href={`/marketplace/${encodeURIComponent(agent.address)}`}
                  className="card group cursor-pointer hover:border-border-light flex items-center gap-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center flex-shrink-0">
                    <Bot className="w-6 h-6 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-ink font-semibold">{truncateAddr(agent.address)}</span>
                      {agent.active && <CheckCircle2 className="w-4 h-4 text-accent" />}
                    </div>
                    <p className="text-sm text-ink-muted truncate">{agent.did}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-ink-subtle">
                      <span>Reputation {(agent.reputationScore / 100).toFixed(0)}%</span>
                      <span>{agentServices.length} services</span>
                      <span>Earned {formatEth(agent.totalEarned)} ETH</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-accent font-semibold">View →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
