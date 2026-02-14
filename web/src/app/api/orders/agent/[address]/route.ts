import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getMarketplace, getRegistry, isConfigured } from '@/lib/contracts';
import { generalLimiter } from '@/lib/rate-limit';

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
  { params }: { params: Promise<{ address: string }> | { address: string } }
) {
  const limited = generalLimiter.check(_request);
  if (limited) return limited;

  const resolved = typeof (params as Promise<{ address: string }>).then === 'function'
    ? await (params as Promise<{ address: string }>)
    : (params as { address: string });
  const rawAddress = resolved?.address;
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
    return NextResponse.json({ orders: [] });
  }
  try {
    const marketplace = getMarketplace();
    const registry = getRegistry();
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
      serviceType?: string;
    }> = [];
    for (const oid of orderIds) {
      const o = await marketplace.orders(oid);
      const service = await registry.services(o.serviceId).catch(() => null);
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
        serviceType: service?.serviceType,
      });
    }
    // Newest first
    orders.sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ orders });
  } catch (e) {
    console.error('API /api/orders/agent/[address]:', e);
    if (isRpcOrNetworkError(e)) {
      return NextResponse.json(
        {
          error:
            'Chain unavailable. Start your local node (e.g. npm run devnet) and ensure NEXT_PUBLIC_RPC_URL and contract addresses are set in web/.env.',
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
