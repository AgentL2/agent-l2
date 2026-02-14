import { NextResponse } from 'next/server';
import { getRegistry, getMarketplace, isConfigured } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

// Simple in-memory cache for stats (avoids O(n) RPC calls on every request)
let statsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 minute

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json({
      agentCount: 0,
      totalVolumeWei: '0',
      protocolFeeBps: 250,
      collectedFeesWei: '0',
      error: 'Contracts not configured',
    });
  }

  // Return cached data if fresh
  if (statsCache && Date.now() - statsCache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(statsCache.data);
  }

  try {
    const registry = getRegistry();
    const marketplace = getMarketplace();
    const [agentCount, protocolFeeBps, collectedFeesWei] = await Promise.all([
      registry.getAgentCount(),
      marketplace.protocolFeeBps(),
      marketplace.collectedFees(),
    ]);

    // Total volume: sum totalEarned across agents (capped to avoid timeout)
    let totalVolumeWei = BigInt(0);
    const count = Number(agentCount);
    const limit = Math.min(count, 100); // Reduced cap for performance

    // Batch fetch in parallel groups of 10 instead of sequential
    const batchSize = 10;
    for (let i = 0; i < limit; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, limit);
      const batch = Array.from({ length: batchEnd - i }, (_, idx) => i + idx);
      const agents = await Promise.all(
        batch.map(async (idx) => {
          const addr = await registry.allAgents(idx);
          return registry.agents(addr);
        })
      );
      for (const agent of agents) {
        totalVolumeWei += agent.totalEarned;
      }
    }

    const data = {
      agentCount: count,
      totalVolumeWei: totalVolumeWei.toString(),
      protocolFeeBps: Number(protocolFeeBps),
      collectedFeesWei: collectedFeesWei.toString(),
    };

    // Update cache
    statsCache = { data, timestamp: Date.now() };

    return NextResponse.json(data);
  } catch (e) {
    console.error('API /api/stats:', e);
    // Return stale cache on error if available
    if (statsCache) {
      return NextResponse.json({ ...statsCache.data, stale: true });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
