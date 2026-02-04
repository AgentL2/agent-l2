import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getRegistry, getMarketplace, isConfigured } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

function isRpcOrNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const lower = msg.toLowerCase();
  return (
    lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('timeout') ||
    lower.includes('could not detect network')
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address: rawAddress } = await params;
  if (!rawAddress || !rawAddress.startsWith('0x')) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }
  let address: string;
  try {
    address = ethers.getAddress(rawAddress);
  } catch {
    return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
  }
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'Contracts not configured. Set NEXT_PUBLIC_REGISTRY_ADDRESS and NEXT_PUBLIC_MARKETPLACE_ADDRESS in .env.' },
      { status: 503 }
    );
  }
  try {
    const registry = getRegistry();
    const marketplace = getMarketplace();
    const agent = await registry.agents(address);
    if (agent.registeredAt === 0n) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    const serviceIds = await registry.getAgentServices(address);
    const services: Array<{
      serviceId: string;
      serviceType: string;
      pricePerUnit: string;
      metadataURI: string;
      active: boolean;
    }> = [];
    for (const id of serviceIds) {
      const s = await registry.services(id);
      services.push({
        serviceId: id,
        serviceType: s.serviceType,
        pricePerUnit: s.pricePerUnit.toString(),
        metadataURI: s.metadataURI,
        active: s.active,
      });
    }
    const orderIds = await marketplace.getAgentOrders(address);
    const orders: Array<{
      orderId: string;
      serviceId: string;
      buyer: string;
      seller: string;
      units: string;
      totalPrice: string;
      createdAt: number;
      deadline: number;
      status: number;
      resultURI: string;
    }> = [];
    for (const oid of orderIds) {
      const o = await marketplace.orders(oid);
      orders.push({
        orderId: oid,
        serviceId: o.serviceId,
        buyer: o.buyer,
        seller: o.seller,
        units: o.units.toString(),
        totalPrice: o.totalPrice.toString(),
        createdAt: Number(o.createdAt),
        deadline: Number(o.deadline),
        status: Number(o.status),
        resultURI: o.resultURI,
      });
    }
    return NextResponse.json({
      agent: {
        address,
        did: agent.did,
        metadataURI: agent.metadataURI,
        reputationScore: Number(agent.reputationScore),
        totalEarned: agent.totalEarned.toString(),
        totalSpent: agent.totalSpent.toString(),
        registeredAt: Number(agent.registeredAt),
        active: agent.active,
      },
      services,
      orders,
    });
  } catch (e) {
    console.error('API /api/agents/[address]:', e);
    if (isRpcOrNetworkError(e)) {
      return NextResponse.json(
        {
          error:
            'Chain unavailable. Start your local node (e.g. npm run devnet in the project root) and ensure NEXT_PUBLIC_RPC_URL and contract addresses are set in web/.env.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch agent' },
      { status: 500 }
    );
  }
}
