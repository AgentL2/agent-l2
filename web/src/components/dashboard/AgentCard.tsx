'use client';

import { useState, useEffect } from 'react';
import { Bot, Copy, ExternalLink, Star, TrendingUp } from 'lucide-react';
import { formatEth, type AgentSummary } from '@/lib/api';
import { fetchAgentMetadata, getAgentDisplayName, type AgentMetadata } from '@/lib/agentMetadata';
import { useToast } from '@/contexts/ToastContext';

interface AgentCardProps {
  agent: AgentSummary;
  address: string;
}

function truncate(s: string, start = 6, end = 4) {
  if (!s || s.length <= start + end) return s;
  return `${s.slice(0, start)}...${s.slice(-end)}`;
}

export default function AgentCard({ agent, address }: AgentCardProps) {
  const [copied, setCopied] = useState(false);
  const [metadata, setMetadata] = useState<AgentMetadata | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    fetchAgentMetadata(agent.metadataURI).then((data) => {
      if (!cancelled) setMetadata(data);
    });
    return () => { cancelled = true; };
  }, [agent.metadataURI]);

  const copyDID = () => {
    navigator.clipboard.writeText(agent.did);
    setCopied(true);
    showToast('DID copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const repPct = (agent.reputationScore / 100).toFixed(0);
  const displayName = metadata ? getAgentDisplayName(metadata, address) : (address ? truncate(address) : 'Agent');
  const avatarUrl = metadata?.imageUrl ?? null;

  return (
    <div className="card">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-surface-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Bot className="w-10 h-10 text-accent" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-ink">{displayName}</h2>
              {agent.active && (
                <span className="px-2 py-1 bg-green-500/20 text-green-500 text-xs font-semibold rounded-full border border-green-500/30">
                  Live
                </span>
              )}
              <span className="px-2 py-1 bg-accent-muted text-accent text-xs font-medium rounded-full border border-accent/30 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                <span>Reputation {repPct}%</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-muted mb-2">
              <span className="font-mono">{truncate(address)}</span>
              <button onClick={copyDID} className="p-1 hover:bg-surface-muted rounded transition-colors" aria-label="Copy DID">
                {copied ? <span className="text-amber-500 text-xs">Copied</span> : <Copy className="w-4 h-4" />}
              </button>
              <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-surface-muted rounded transition-colors" aria-label="View on Explorer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-ink-muted text-sm max-w-xl truncate">
              DID: {agent.did}
              {metadata?.description ? ` · ${metadata.description.slice(0, 80)}${metadata.description.length > 80 ? '…' : ''}` : ''}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 md:min-w-[280px]">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent mb-1 data-highlight">{repPct}%</div>
            <div className="text-xs text-ink-subtle uppercase tracking-wider">Reputation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-500 mb-1 data-highlight">{formatEth(agent.totalEarned)}</div>
            <div className="text-xs text-ink-subtle uppercase tracking-wider">Earned (ETH)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent mb-1 flex items-center justify-center gap-1 data-highlight">
              <TrendingUp className="w-5 h-5" />
              <span>{formatEth(agent.totalSpent)}</span>
            </div>
            <div className="text-xs text-ink-subtle uppercase tracking-wider">Spent (ETH)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
