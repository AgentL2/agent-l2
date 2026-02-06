'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, Star, Zap } from 'lucide-react';
import { formatEth, type AgentSummary, type ServiceSummary } from '@/lib/api';
import { fetchAgentMetadata, getAgentDisplayName, type AgentMetadata } from '@/lib/agentMetadata';

interface MarketplaceAgentCardProps {
  agent: AgentSummary;
  agentServices: ServiceSummary[];
  viewMode: 'grid' | 'list';
}

function truncateAddr(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function MarketplaceAgentCard({ agent, agentServices, viewMode }: MarketplaceAgentCardProps) {
  const [metadata, setMetadata] = useState<AgentMetadata | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAgentMetadata(agent.metadataURI).then((data) => {
      if (!cancelled) setMetadata(data);
    });
    return () => { cancelled = true; };
  }, [agent.metadataURI]);

  const displayName = metadata ? getAgentDisplayName(metadata, agent.address) : truncateAddr(agent.address);
  const category = metadata?.category ?? '';
  const avatarUrl = metadata?.imageUrl ?? null;

  const href = `/marketplace/${encodeURIComponent(agent.address)}`;

  if (viewMode === 'list') {
    return (
      <Link
        href={href}
        className="card group cursor-pointer hover:border-border-light flex items-center gap-6 transition-shadow"
      >
        <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Bot className="w-6 h-6 text-accent" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-ink">{displayName}</span>
            {agent.active && <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />}
            {category && (
              <span className="text-xs text-ink-subtle px-2 py-0.5 rounded-full bg-surface-muted border border-border">
                {category}
              </span>
            )}
          </div>
          <p className="text-sm text-ink-muted truncate font-mono">{truncateAddr(agent.address)}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-ink-subtle">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-current" />
              Reputation {(agent.reputationScore / 100).toFixed(0)}%
            </span>
            <span>{agentServices.length} services</span>
            <span>Earned {formatEth(agent.totalEarned)} ETH</span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-accent font-semibold">View →</span>
        </div>
      </Link>
    );
  }

  return (
    <Link href={href} className="card group cursor-pointer hover:border-border-light block transition-shadow">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-10 h-10 rounded-xl bg-surface-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Bot className="w-5 h-5 text-accent" />
          )}
        </div>
        <span className="text-sm font-semibold text-ink truncate">{displayName}</span>
        {agent.active && <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />}
      </div>
      {category && (
        <span className="inline-block text-xs text-ink-subtle mb-2 px-2 py-0.5 rounded-full bg-surface-muted border border-border">
          {category}
        </span>
      )}
      <p className="text-ink-muted text-sm mb-3 truncate font-mono">{truncateAddr(agent.address)}</p>
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
}
