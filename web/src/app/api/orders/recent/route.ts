import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getProvider, getChainConfig, isConfigured } from '@/lib/contracts';

export const dynamic = 'force-dynamic';

const MARKETPLACE_IFACE = new ethers.Interface([
  'event OrderCreated(bytes32 indexed orderId, bytes32 indexed serviceId, address indexed buyer, address seller, uint256 totalPrice)',
  'event OrderCompleted(bytes32 indexed orderId, string resultURI)',
]);

export async function GET(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json({ events: [] });
  }
  try {
    const provider = getProvider();
    const { marketplaceAddress } = getChainConfig();
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, Number(currentBlock) - 10000);
    const logs = await provider.getLogs({
      address: marketplaceAddress,
      fromBlock: BigInt(fromBlock),
      toBlock: currentBlock,
    });
    const events: Array<{
      type: 'OrderCreated' | 'OrderCompleted';
      orderId: string;
      serviceId?: string;
      buyer?: string;
      seller?: string;
      totalPrice?: string;
      resultURI?: string;
      blockNumber: number;
    }> = [];
    for (const log of logs) {
      try {
        const parsed = MARKETPLACE_IFACE.parseLog({ topics: log.topics as string[], data: log.data });
        if (!parsed) continue;
        if (parsed.name === 'OrderCreated') {
          events.push({
            type: 'OrderCreated',
            orderId: parsed.args.orderId,
            serviceId: parsed.args.serviceId,
            buyer: parsed.args.buyer,
            seller: parsed.args.seller,
            totalPrice: parsed.args.totalPrice?.toString(),
            blockNumber: Number(log.blockNumber),
          });
        } else if (parsed.name === 'OrderCompleted') {
          events.push({
            type: 'OrderCompleted',
            orderId: parsed.args.orderId,
            resultURI: parsed.args.resultURI,
            blockNumber: Number(log.blockNumber),
          });
        }
      } catch {
        // skip unparseable
      }
    }
    events.sort((a, b) => b.blockNumber - a.blockNumber);
    return NextResponse.json({ events: events.slice(0, limit) });
  } catch (e) {
    console.error('API /api/orders/recent:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch recent orders' },
      { status: 500 }
    );
  }
}
