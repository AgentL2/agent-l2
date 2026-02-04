import { NextRequest, NextResponse } from 'next/server';
import { getRegistry, isConfigured } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ agents: [], total: 0 });
  }
  try {
    const registry = getRegistry();
    const count = Number(await registry.getAgentCount());
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));
    const agents: Array<{
      address: string;
      did: string;
      metadataURI: string;
      reputationScore: number;
      totalEarned: string;
      totalSpent: string;
      registeredAt: number;
      active: boolean;
    }> = [];
    for (let i = offset; i < Math.min(offset + limit, count); i++) {
      const address = await registry.allAgents(i);
      const a = await registry.agents(address);
      agents.push({
        address,
        did: a.did,
        metadataURI: a.metadataURI,
        reputationScore: Number(a.reputationScore),
        totalEarned: a.totalEarned.toString(),
        totalSpent: a.totalSpent.toString(),
        registeredAt: Number(a.registeredAt),
        active: a.active,
      });
    }
    return NextResponse.json({ agents, total: count });
  } catch (e) {
    console.error('API /api/agents:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}
