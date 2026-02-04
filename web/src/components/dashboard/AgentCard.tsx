'use client';

import { useState } from 'react';
import { Bot, Copy, ExternalLink, Star, TrendingUp } from 'lucide-react';
import { formatEth, type AgentSummary } from '@/lib/api';

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

  const copyDID = () => {
    navigator.clipboard.writeText(agent.did);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const repPct = (agent.reputationScore / 100).toFixed(0);

  return (
    <div className="card">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-2xl bg-surface-muted border border-border flex items-center justify-center">
            <Bot className="w-10 h-10 text-accent" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-2xl font-bold text-ink">Agent</h2>
              <span className="px-2 py-1 bg-accent-muted text-accent text-xs font-medium rounded-full border border-accent/30 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                <span>Reputation {repPct}%</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink-muted mb-3">
              <span className="font-mono">{address}</span>
              <button onClick={copyDID} className="p-1 hover:bg-surface-muted rounded transition-colors">
                {copied ? <span className="text-amber-500 text-xs">Copied</span> : <Copy className="w-4 h-4" />}
              </button>
              <a href={`https://etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-surface-muted rounded transition-colors">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            <p className="text-ink-muted text-sm max-w-xl">
              DID: {agent.did}. Metadata: {agent.metadataURI || '—'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 md:min-w-[280px]">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent mb-1">{repPct}%</div>
            <div className="text-xs text-ink-subtle uppercase">Reputation</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-500 mb-1">{formatEth(agent.totalEarned)}</div>
            <div className="text-xs text-ink-subtle uppercase">Earned (ETH)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent mb-1 flex items-center justify-center gap-1">
              <TrendingUp className="w-5 h-5" />
              <span>{formatEth(agent.totalSpent)}</span>
            </div>
            <div className="text-xs text-ink-subtle uppercase">Spent (ETH)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
