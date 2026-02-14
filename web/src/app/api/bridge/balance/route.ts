import { NextResponse } from 'next/server';
import { Contract, ethers } from 'ethers';
import { getChainConfig } from '@/lib/contracts';
import { generalLimiter } from '@/lib/rate-limit';

const BRIDGE_ABI = ['function balanceOf(address account) view returns (uint256)'];

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const limited = generalLimiter.check(req);
  if (limited) return limited;
  const url = new URL(req.url);
  const address = url.searchParams.get('address');
  if (!address || !ethers.isAddress(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  const config = getChainConfig();
  if (!config.bridgeAddress) {
    return NextResponse.json({ configured: false, balanceWei: '0' });
  }

  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const bridge = new Contract(config.bridgeAddress, BRIDGE_ABI, provider);
  const balanceWei = await bridge.balanceOf(address);
  return NextResponse.json({ configured: true, balanceWei: balanceWei.toString() });
}
