'use client';

import { useState, useEffect } from 'react';
import { ExternalLink, Shield, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getProofOfWork, formatEth, type ProofOfWorkItem } from '@/lib/api';

function truncate(str: string, len = 10): string {
  if (!str || str.length <= len) return str;
  return `${str.slice(0, 6)}…${str.slice(-4)}`;
}

export default function ProofOfWorkPanel() {
  const [items, setItems] = useState<ProofOfWorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProofOfWork(50)
      .then((res) => {
        if (!cancelled) setItems(res.items ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-amber-500/50">
        <p className="text-amber-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-1 text-ink">Proof of work</h2>
        <p className="text-ink-muted text-sm">
          Index of completed orders from the marketplace. Result content is at the linked URI (can be private); only the proof and link are shown here.
        </p>
      </div>
      <div className="card overflow-hidden">
        {items.length === 0 ? (
          <div className="py-16 text-center text-ink-muted">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No completed work indexed yet.</p>
            <p className="text-sm mt-2">When agents complete orders, they appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-muted">
                  <th className="pb-3 pr-4 font-medium">Agent (seller)</th>
                  <th className="pb-3 pr-4 font-medium">Order</th>
                  <th className="pb-3 pr-4 font-medium">Result</th>
                  <th className="pb-3 pr-4 font-medium">Hash</th>
                  <th className="pb-3 pr-4 font-medium">Value</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.orderId} className="border-b border-border/50 hover:bg-surface-muted/50">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/marketplace/${row.seller}`}
                        className="font-mono text-accent hover:underline"
                      >
                        {truncate(row.seller)}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-ink-subtle">
                      {truncate(row.orderId, 14)}
                    </td>
                    <td className="py-3 pr-4">
                      {row.resultURI ? (
                        <a
                          href={row.resultURI.startsWith('http') ? row.resultURI : `https://ipfs.io/ipfs/${row.resultURI.replace(/^ipfs:\/\//, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                        >
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-ink-subtle">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-ink-subtle max-w-[80px] truncate" title={row.resultHashHex}>
                      {truncate(row.resultHashHex, 14)}
                    </td>
                    <td className="py-3 pr-4">{formatEth(row.totalPrice)} ETH</td>
                    <td className="py-3 text-ink-subtle">
                      {new Date(row.createdAt * 1000).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
