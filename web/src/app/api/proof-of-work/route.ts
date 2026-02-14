import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getProvider, getMarketplace, getChainConfig, isConfigured } from '@/lib/contracts';
import { generalLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const MARKETPLACE_IFACE = new ethers.Interface([
  'event OrderCompleted(bytes32 indexed orderId, string resultURI)',
]);

/** Index of completed work (proof of work) from the marketplace. Result content stays at resultURI (can be private). */
export async function GET(request: NextRequest) {
  const limited = generalLimiter.check(request);
  if (limited) return limited;
  if (!isConfigured()) {
    return NextResponse.json({ items: [] });
  }
  try {
    const provider = getProvider();
    const marketplace = getMarketplace();
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const agentFilter = searchParams.get('agent'); // optional: filter by seller address

    const currentBlock = await provider.getBlockNumber();
    // Monad/testnet limits eth_getLogs to 100 blocks, so we batch
    const MAX_RANGE = 100;
    const LOOKBACK = 5000; // How far back to search (in batches of 100)
    const fromBlock = Math.max(0, Number(currentBlock) - LOOKBACK);
    
    const logs: ethers.Log[] = [];
    for (let start = fromBlock; start < Number(currentBlock); start += MAX_RANGE) {
      const end = Math.min(start + MAX_RANGE - 1, Number(currentBlock));
      try {
        const batchLogs = await provider.getLogs({
          address: getChainConfig().marketplaceAddress,
          fromBlock: BigInt(start),
          toBlock: BigInt(end),
        });
        logs.push(...batchLogs);
      } catch {
        // Skip failed batches
      }
    }

    const orderIds: string[] = [];
    for (const log of logs) {
      try {
        const parsed = MARKETPLACE_IFACE.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed?.name === 'OrderCompleted') orderIds.push(parsed.args.orderId);
      } catch {
        // skip
      }
    }

    const items: Array<{
      orderId: string;
      seller: string;
      buyer: string;
      resultURI: string;
      resultHashHex: string;
      totalPrice: string;
      createdAt: number;
      serviceId: string;
    }> = [];

    for (const orderId of orderIds) {
      try {
        const o = await marketplace.orders(orderId);
        const status = Number(o.status);
        if (status !== 1) continue; // 1 = Completed
        const resultURI = (o.resultURI as string)?.trim() || '';
        if (!resultURI) continue;
        const seller = (o.seller as string) ?? '';
        if (agentFilter && ethers.getAddress(agentFilter) !== seller) continue;
        items.push({
          orderId,
          seller,
          buyer: (o.buyer as string) ?? '',
          resultURI,
          resultHashHex: ethers.hexlify((o.resultHash as string | Uint8Array) ?? '0x'),
          totalPrice: (o.totalPrice as bigint)?.toString() ?? '0',
          createdAt: Number(o.createdAt),
          serviceId: (o.serviceId as string) ?? '',
        });
      } catch {
        // skip missing or failed order read
      }
    }

    items.sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ items: items.slice(0, limit) });
  } catch (e) {
    console.error('API /api/proof-of-work:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch proof of work' },
      { status: 500 }
    );
  }
}
