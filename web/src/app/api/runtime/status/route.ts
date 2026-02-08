/**
 * Runtime Status API
 * Returns the status of an agent's runtime (connected via webhook)
 * 
 * In production, this would query a runtime registry or the agent's webhook endpoint.
 * For the MVP, we store runtime status in memory (or could use a simple KV store).
 */

import { NextResponse } from 'next/server';

// In-memory runtime status store (would be Redis/DB in production)
// This gets populated by the runtime's webhook notifications
const runtimeStatuses = new Map<string, RuntimeStatusData>();

interface RuntimeStatusData {
  running: boolean;
  address: string;
  isRegistered: boolean;
  processingOrders: number;
  processedOrders: number;
  executors: { id: string; name: string; healthy: boolean }[];
  lastHeartbeat: number;
  recentEvents: RuntimeEvent[];
  config?: RuntimeConfigSummary;
}

interface RuntimeEvent {
  type: string;
  timestamp: number;
  orderId?: string;
  executorId?: string;
  error?: string;
  txHash?: string;
}

interface RuntimeConfigSummary {
  pollInterval: number;
  maxConcurrent: number;
  autoComplete: boolean;
  hasOpenAI: boolean;
  executorCount: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (!address) {
    return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();
  const status = runtimeStatuses.get(normalizedAddress);

  if (!status) {
    // Check if there's a registered webhook for this agent
    // For MVP, return "not connected" status
    return NextResponse.json({
      connected: false,
      address: normalizedAddress,
      message: 'No runtime connected. Start the runtime with webhook configured to enable monitoring.',
    });
  }

  // Check if runtime is stale (no heartbeat in 60 seconds)
  const isStale = Date.now() - status.lastHeartbeat > 60000;

  return NextResponse.json({
    connected: !isStale,
    stale: isStale,
    ...status,
  });
}

// Endpoint for runtime to report status (called by runtime's webhook)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, status, event } = body;

    if (!address) {
      return NextResponse.json({ error: 'Missing address' }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    let currentStatus = runtimeStatuses.get(normalizedAddress);

    // If this is a status update
    if (status) {
      const newStatus: RuntimeStatusData = {
        ...status,
        lastHeartbeat: Date.now(),
        recentEvents: currentStatus?.recentEvents ?? [],
      };
      currentStatus = newStatus;
      runtimeStatuses.set(normalizedAddress, newStatus);
    }

    // If this is an event notification
    if (event) {
      if (!currentStatus) {
        currentStatus = {
          running: true,
          address: normalizedAddress,
          isRegistered: true,
          processingOrders: 0,
          processedOrders: 0,
          executors: [],
          lastHeartbeat: Date.now(),
          recentEvents: [],
        };
      }

      // Add event to recent events (keep last 50)
      const recentEvents = [
        { ...event, timestamp: Date.now() },
        ...(currentStatus.recentEvents || []),
      ].slice(0, 50);

      // Update status based on event type
      if (event.type === 'started') {
        currentStatus.running = true;
      } else if (event.type === 'execution_started') {
        currentStatus.processingOrders = (currentStatus.processingOrders || 0) + 1;
      } else if (event.type === 'execution_completed' || event.type === 'execution_failed') {
        currentStatus.processingOrders = Math.max(0, (currentStatus.processingOrders || 0) - 1);
      } else if (event.type === 'order_completed') {
        currentStatus.processedOrders = (currentStatus.processedOrders || 0) + 1;
      }

      currentStatus.recentEvents = recentEvents;
      currentStatus.lastHeartbeat = Date.now();
      runtimeStatuses.set(normalizedAddress, currentStatus as RuntimeStatusData);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Runtime Status API] Error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Allow runtime to disconnect
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');

  if (address) {
    runtimeStatuses.delete(address.toLowerCase());
  }

  return NextResponse.json({ ok: true });
}
