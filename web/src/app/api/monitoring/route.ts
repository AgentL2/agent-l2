/**
 * Monitoring Dashboard API
 *
 * Aggregates health from all services:
 * - Sequencer /health
 * - Runtime API /health
 * - Contract state (paused status, latest activity)
 *
 * Returns a combined system status for the dashboard.
 */

import { NextResponse } from 'next/server';
import { getChainConfig, isConfigured, getProvider } from '@/lib/contracts';
import { ethers, Contract } from 'ethers';

export const dynamic = 'force-dynamic';

const BRIDGE_ABI = [
  'function paused() view returns (bool)',
  'function WITHDRAWAL_DELAY() view returns (uint256)',
];

interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'unreachable';
  timestamp?: string;
  uptime?: number;
  detail?: Record<string, unknown>;
  error?: string;
}

async function fetchServiceHealth(url: string, timeoutMs = 5000): Promise<ServiceHealth> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      return {
        status: 'unhealthy',
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      status: data.status === 'ok' || data.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: data.timestamp,
      uptime: data.uptime,
      detail: data,
    };
  } catch (err) {
    return {
      status: 'unreachable',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const config = getChainConfig();

  // Service URLs from environment (with sensible defaults)
  const sequencerUrl = process.env.SEQUENCER_URL || 'http://127.0.0.1:3040';
  const runtimeApiUrl = process.env.RUNTIME_API_URL || 'http://127.0.0.1:3001';

  // Fetch health from both services in parallel
  const [sequencerHealth, runtimeHealth] = await Promise.all([
    fetchServiceHealth(`${sequencerUrl}/health`),
    fetchServiceHealth(`${runtimeApiUrl}/health`),
  ]);

  // Contract state
  let contractState: Record<string, unknown> = { configured: false };
  if (isConfigured() && config.bridgeAddress) {
    try {
      const provider = getProvider();
      const bridge = new Contract(config.bridgeAddress, BRIDGE_ABI, provider);

      // Check paused status
      let paused: boolean | null = null;
      try {
        paused = await bridge.paused();
      } catch {
        // paused() may not exist
      }

      // Get latest block for activity timestamp
      const latestBlock = await provider.getBlock('latest');

      contractState = {
        configured: true,
        bridgeAddress: config.bridgeAddress,
        paused,
        latestBlock: latestBlock ? latestBlock.number : null,
        latestBlockTimestamp: latestBlock ? new Date(latestBlock.timestamp * 1000).toISOString() : null,
      };
    } catch (err) {
      contractState = {
        configured: true,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Determine overall system status
  const services = { sequencer: sequencerHealth, runtime: runtimeHealth };
  const allHealthy = Object.values(services).every((s) => s.status === 'healthy');
  const anyUnreachable = Object.values(services).some((s) => s.status === 'unreachable');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (allHealthy) {
    overallStatus = 'healthy';
  } else if (anyUnreachable) {
    overallStatus = 'unhealthy';
  } else {
    overallStatus = 'degraded';
  }

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services,
    contracts: contractState,
    chain: {
      rpcUrl: config.rpcUrl,
      chainId: config.chainId,
    },
  });
}
