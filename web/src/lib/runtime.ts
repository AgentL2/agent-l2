/**
 * Runtime API client and types
 * Used by the dashboard to interact with the runtime status API
 */

export interface RuntimeStatus {
  connected: boolean;
  stale?: boolean;
  running?: boolean;
  address?: string;
  isRegistered?: boolean;
  processingOrders?: number;
  processedOrders?: number;
  executors?: RuntimeExecutor[];
  lastHeartbeat?: number;
  recentEvents?: RuntimeEvent[];
  config?: RuntimeConfig;
  message?: string;
}

export interface RuntimeExecutor {
  id: string;
  name: string;
  healthy: boolean;
  serviceTypes?: string[];
}

export interface RuntimeEvent {
  type: RuntimeEventType;
  timestamp: number;
  orderId?: string;
  executorId?: string;
  error?: string;
  txHash?: string;
  serviceType?: string;
  durationMs?: number;
}

export type RuntimeEventType =
  | 'started'
  | 'stopped'
  | 'order_received'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'order_completed'
  | 'error';

export interface RuntimeConfig {
  pollInterval: number;
  maxConcurrent: number;
  autoComplete: boolean;
  hasOpenAI: boolean;
  executorCount: number;
}

/**
 * Fetch runtime status for an agent
 */
export async function getRuntimeStatus(address: string): Promise<RuntimeStatus> {
  const response = await fetch(`/api/runtime/status?address=${encodeURIComponent(address)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch runtime status');
  }
  return response.json();
}

/**
 * Subscribe to runtime events via polling
 * (SSE would be better for production, but polling works for MVP)
 */
export function subscribeToRuntimeEvents(
  address: string,
  onEvent: (event: RuntimeEvent) => void,
  onConnect?: () => void,
  onDisconnect?: () => void
): () => void {
  let lastEventCount = 0;
  let isConnected = false;

  const poll = async () => {
    try {
      const status = await getRuntimeStatus(address);
      if (!isConnected && status.connected) {
        isConnected = true;
        onConnect?.();
      } else if (isConnected && !status.connected) {
        isConnected = false;
        onDisconnect?.();
      }

      // Check for new events
      if (status.recentEvents && status.recentEvents.length > lastEventCount) {
        const newEvents = status.recentEvents.slice(0, status.recentEvents.length - lastEventCount);
        for (const event of newEvents.reverse()) {
          onEvent(event);
        }
        lastEventCount = status.recentEvents.length;
      }
    } catch {
      if (isConnected) {
        isConnected = false;
        onDisconnect?.();
      }
    }
  };

  // Initial poll
  poll();

  // Poll every 5 seconds
  const interval = setInterval(poll, 5000);

  // Return cleanup function
  return () => {
    clearInterval(interval);
  };
}

/**
 * Format event type for display
 */
export function formatEventType(type: RuntimeEventType): string {
  const labels: Record<RuntimeEventType, string> = {
    started: 'Runtime Started',
    stopped: 'Runtime Stopped',
    order_received: 'Order Received',
    execution_started: 'Execution Started',
    execution_completed: 'Execution Completed',
    execution_failed: 'Execution Failed',
    order_completed: 'Order Completed',
    error: 'Error',
  };
  return labels[type] ?? type;
}

/**
 * Get event color/status
 */
export function getEventColor(type: RuntimeEventType): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  const colors: Record<RuntimeEventType, 'green' | 'yellow' | 'red' | 'blue' | 'gray'> = {
    started: 'green',
    stopped: 'gray',
    order_received: 'blue',
    execution_started: 'yellow',
    execution_completed: 'green',
    execution_failed: 'red',
    order_completed: 'green',
    error: 'red',
  };
  return colors[type] ?? 'gray';
}

/**
 * Format timestamp for display
 */
export function formatEventTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return `${diffSec}s ago`;
  } else if (diffSec < 3600) {
    return `${Math.floor(diffSec / 60)}m ago`;
  } else if (diffSec < 86400) {
    return `${Math.floor(diffSec / 3600)}h ago`;
  }
  return date.toLocaleTimeString();
}
