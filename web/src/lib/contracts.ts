/**
 * AgentL2 read-only contract access for API routes.
 * Uses ethers Provider (no wallet) to read from deployed contracts.
 */

import { ethers, Contract, Provider } from 'ethers';

const REGISTRY_ABI = [
  'function agents(address) view returns (address owner, string did, string metadataURI, uint256 reputationScore, uint256 totalEarned, uint256 totalSpent, uint256 registeredAt, bool active)',
  'function services(bytes32) view returns (address agent, string serviceType, uint256 pricePerUnit, string metadataURI, bool active)',
  'function getAgentServices(address agent) view returns (bytes32[])',
  'function getAgentCount() view returns (uint256)',
  'function allAgents(uint256 index) view returns (address)',
  'function isActiveAgent(address agent) view returns (bool)',
];

const MARKETPLACE_ABI = [
  'function orders(bytes32) view returns (bytes32 serviceId, address buyer, address seller, uint256 units, uint256 totalPrice, uint256 createdAt, uint256 deadline, uint8 status, string resultURI, bytes resultHash)',
  'function getAgentOrders(address agent) view returns (bytes32[])',
  'function protocolFeeBps() view returns (uint256)',
  'function collectedFees() view returns (uint256)',
  'event OrderCreated(bytes32 indexed orderId, bytes32 indexed serviceId, address indexed buyer, address seller, uint256 totalPrice)',
  'event OrderCompleted(bytes32 indexed orderId, string resultURI)',
];

export interface ChainConfig {
  rpcUrl: string;
  chainId: number;
  registryAddress: string;
  marketplaceAddress: string;
  bridgeAddress: string;
}

function getConfig(): ChainConfig {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
  const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '1337', 10);
  const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '';
  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '';
  const bridgeAddress = process.env.NEXT_PUBLIC_BRIDGE_ADDRESS || '';
  return { rpcUrl, chainId, registryAddress, marketplaceAddress, bridgeAddress };
}

let provider: Provider | null = null;
let registry: Contract | null = null;
let marketplace: Contract | null = null;

export function getChainConfig(): ChainConfig {
  return getConfig();
}

export function getProvider(): Provider {
  if (!provider) {
    const { rpcUrl } = getConfig();
    provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return provider;
}

export function getRegistry(): Contract {
  if (!registry) {
    const { registryAddress } = getConfig();
    if (!registryAddress) throw new Error('NEXT_PUBLIC_REGISTRY_ADDRESS not set');
    registry = new Contract(registryAddress, REGISTRY_ABI, getProvider());
  }
  return registry;
}

export function getMarketplace(): Contract {
  if (!marketplace) {
    const { marketplaceAddress } = getConfig();
    if (!marketplaceAddress) throw new Error('NEXT_PUBLIC_MARKETPLACE_ADDRESS not set');
    marketplace = new Contract(marketplaceAddress, MARKETPLACE_ABI, getProvider());
  }
  return marketplace;
}

export function isConfigured(): boolean {
  const c = getConfig();
  return !!(c.registryAddress && c.marketplaceAddress);
}
