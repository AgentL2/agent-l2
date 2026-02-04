import { NextRequest, NextResponse } from 'next/server';
import { getRegistry, isConfigured } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ services: [] });
  }
  try {
    const registry = getRegistry();
    const count = Number(await registry.getAgentCount());
    const limit = Math.min(count, 200);
    const services: Array<{
      serviceId: string;
      agent: string;
      serviceType: string;
      pricePerUnit: string;
      metadataURI: string;
      active: boolean;
    }> = [];
    for (let i = 0; i < limit; i++) {
      const agentAddress = await registry.allAgents(i);
      const serviceIds = await registry.getAgentServices(agentAddress);
      for (const sid of serviceIds) {
        const s = await registry.services(sid);
        if (s.active) {
          services.push({
            serviceId: sid,
            agent: agentAddress,
            serviceType: s.serviceType,
            pricePerUnit: s.pricePerUnit.toString(),
            metadataURI: s.metadataURI,
            active: s.active,
          });
        }
      }
    }
    return NextResponse.json({ services });
  } catch (e) {
    console.error('API /api/services:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch services' },
      { status: 500 }
    );
  }
}
