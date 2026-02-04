/**
 * API client for AgentL2 backend (reads from chain via API routes).
 */

const API_BASE = '';

export interface ChainConfig {
  configured: boolean;
  rpcUrl: string;
  chainId: number;
  registryAddress: string | null;
  marketplaceAddress: string | null;
  bridgeAddress: string | null;
}

export interface StatsResponse {
  agentCount: number;
  totalVolumeWei: string;
  protocolFeeBps: number;
  collectedFeesWei: string;
  error?: string;
}

export interface AgentSummary {
  address: string;
  did: string;
  metadataURI: string;
  reputationScore: number;
  totalEarned: string;
  totalSpent: string;
  registeredAt: number;
  active: boolean;
}

export interface AgentDetailResponse {
  agent: AgentSummary;
  services: Array<{
    serviceId: string;
    serviceType: string;
    pricePerUnit: string;
    metadataURI: string;
    active: boolean;
  }>;
  orders: Array<{
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
  }>;
}

export interface ServiceSummary {
  serviceId: string;
  agent: string;
  serviceType: string;
  pricePerUnit: string;
  metadataURI: string;
  active: boolean;
}

export interface OrderSummary {
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
}

export interface RecentEvent {
  type: 'OrderCreated' | 'OrderCompleted';
  orderId: string;
  serviceId?: string;
  buyer?: string;
  seller?: string;
  totalPrice?: string;
  resultURI?: string;
  blockNumber: number;
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError((err as { error?: string }).error || res.statusText, res.status);
  }
  return res.json();
}

export async function getConfig(): Promise<ChainConfig> {
  return fetchJson<ChainConfig>('/api/config');
}

export async function getStats(): Promise<StatsResponse> {
  return fetchJson<StatsResponse>('/api/stats');
}

export async function getAgents(limit = 50, offset = 0): Promise<{ agents: AgentSummary[]; total: number }> {
  return fetchJson(`/api/agents?limit=${limit}&offset=${offset}`);
}

export async function getAgent(address: string): Promise<AgentDetailResponse> {
  return fetchJson(`/api/agents/${encodeURIComponent(address)}`);
}

export async function getServices(): Promise<{ services: ServiceSummary[] }> {
  return fetchJson('/api/services');
}

export async function getRecentOrderEvents(limit = 30): Promise<{ events: RecentEvent[] }> {
  const res = await fetchJson<{ events: RecentEvent[] }>(`/api/orders/recent?limit=${limit}`);
  return res;
}

export async function getAgentOrders(address: string): Promise<{ orders: OrderSummary[] }> {
  return fetchJson(`/api/orders/agent/${encodeURIComponent(address)}`);
}

export function formatEth(wei: string | bigint): string {
  const w = typeof wei === 'string' ? BigInt(wei) : wei;
  const eth = Number(w) / 1e18;
  if (eth >= 1) return eth.toFixed(2);
  if (eth >= 0.01) return eth.toFixed(4);
  return eth.toFixed(6);
}

export const ORDER_STATUS: Record<number, string> = {
  0: 'Pending',
  1: 'Completed',
  2: 'Disputed',
  3: 'Cancelled',
  4: 'Refunded',
};
