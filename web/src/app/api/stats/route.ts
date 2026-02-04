import { NextResponse } from 'next/server';
import { getRegistry, getMarketplace, isConfigured } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

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
  try {
    const registry = getRegistry();
    const marketplace = getMarketplace();
    const [agentCount, protocolFeeBps, collectedFeesWei] = await Promise.all([
      registry.getAgentCount(),
      marketplace.protocolFeeBps(),
      marketplace.collectedFees(),
    ]);
    // Total volume: sum totalEarned across all agents (expensive for many agents; cap at 500)
    let totalVolumeWei = BigInt(0);
    const count = Number(agentCount);
    const limit = Math.min(count, 500);
    for (let i = 0; i < limit; i++) {
      const addr = await registry.allAgents(i);
      const agent = await registry.agents(addr);
      totalVolumeWei += agent.totalEarned;
    }
    return NextResponse.json({
      agentCount: count,
      totalVolumeWei: totalVolumeWei.toString(),
      protocolFeeBps: Number(protocolFeeBps),
      collectedFeesWei: collectedFeesWei.toString(),
    });
  } catch (e) {
    console.error('API /api/stats:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
