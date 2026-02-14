import { NextResponse } from 'next/server';
import { getChainConfig, isConfigured } from '@/lib/contracts';
import { getL1BridgeConfig } from '@/lib/bridge';
import { generalLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const limited = generalLimiter.check(request);
  if (limited) return limited;
  const config = getChainConfig();
  const l1Config = getL1BridgeConfig();
  return NextResponse.json({
    configured: isConfigured(),
    rpcUrl: config.rpcUrl,
    chainId: config.chainId,
    registryAddress: config.registryAddress || null,
    marketplaceAddress: config.marketplaceAddress || null,
    bridgeAddress: config.bridgeAddress || null,
    l1BridgeAddress: l1Config?.l1BridgeAddress ?? null,
    l1RpcUrl: l1Config?.l1RpcUrl ?? null,
    l1ChainId: l1Config?.l1ChainId ?? null,
  });
}
