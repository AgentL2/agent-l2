/**
 * Browser-side write helpers for AgentL2.
 * Uses connected wallet signer; config from NEXT_PUBLIC_* env.
 */

import { ethers, type Signer, Contract } from 'ethers';

const REGISTRY_WRITE_ABI = [
  'function registerAgent(address agent, string did, string metadataURI)',
  'function registerService(address agent, string serviceType, uint256 pricePerUnit, string metadataURI) returns (bytes32)',
  'event ServiceRegistered(bytes32 indexed serviceId, address indexed agent, string serviceType)',
];

const MARKETPLACE_WRITE_ABI = [
  'function createOrder(bytes32 serviceId, uint256 units, uint256 deadline) payable returns (bytes32)',
  'event OrderCreated(bytes32 indexed orderId, bytes32 indexed serviceId, address indexed buyer, address seller, uint256 totalPrice)',
];

export interface ChainConfig {
  rpcUrl: string;
  registryAddress: string;
  marketplaceAddress: string;
}

function getBrowserConfig(): ChainConfig {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545';
  const registryAddress = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '';
  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '';
  return { rpcUrl, registryAddress, marketplaceAddress };
}

export function isWritesConfigured(): boolean {
  const c = getBrowserConfig();
  return !!(c.registryAddress && c.marketplaceAddress);
}

/** On local devnet (chainId 1337) use 0 confirmations for faster UX. */
function getConfirmations(): number {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);
  return chainId === 1337 ? 0 : 1;
}

/** Generate DID in same format as SDK */
export function generateDID(address: string): string {
  return `did:key:z${address.slice(2, 50)}`;
}

/** Register an agent. Caller must be the agent's owner (msg.sender). Agent = address to register. */
export async function registerAgent(
  signer: Signer,
  agentAddress: string,
  did: string,
  metadataURI: string
): Promise<{ txHash: string }> {
  const { registryAddress } = getBrowserConfig();
  if (!registryAddress) throw new Error('Registry address not configured');
  const registry = new Contract(registryAddress, REGISTRY_WRITE_ABI, signer);
  const tx = await registry.registerAgent(agentAddress, did, metadataURI);
  const receipt = await tx.wait(getConfirmations());
  return { txHash: receipt!.hash };
}

/** Register a service for an agent. Returns serviceId from event. */
export async function registerService(
  signer: Signer,
  agentAddress: string,
  serviceType: string,
  pricePerUnitWei: bigint,
  metadataURI: string
): Promise<{ serviceId: string; txHash: string }> {
  const { registryAddress } = getBrowserConfig();
  if (!registryAddress) throw new Error('Registry address not configured');
  const registry = new Contract(registryAddress, REGISTRY_WRITE_ABI, signer);
  const tx = await registry.registerService(agentAddress, serviceType, pricePerUnitWei, metadataURI);
  const receipt = await tx.wait(getConfirmations());
  const iface = new ethers.Interface(REGISTRY_WRITE_ABI);
  let serviceId = '0x';
  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === 'ServiceRegistered') {
        serviceId = parsed.args.serviceId;
        break;
      }
    } catch {
      // skip
    }
  }
  return { serviceId, txHash: receipt!.hash };
}

/** Create an order; value must be >= totalPrice (pricePerUnit * units). */
export async function createOrder(
  signer: Signer,
  serviceId: string,
  units: bigint,
  deadlineSeconds: number,
  valueWei: bigint
): Promise<{ orderId: string; txHash: string }> {
  const { marketplaceAddress } = getBrowserConfig();
  if (!marketplaceAddress) throw new Error('Marketplace address not configured');
  const marketplace = new Contract(marketplaceAddress, MARKETPLACE_WRITE_ABI, signer);
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const tx = await marketplace.createOrder(serviceId, units, deadline, { value: valueWei });
  const receipt = await tx.wait(getConfirmations());
  const iface = new ethers.Interface(MARKETPLACE_WRITE_ABI);
  let orderId = '0x';
  for (const log of receipt!.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === 'OrderCreated') {
        orderId = parsed.args.orderId;
        break;
      }
    } catch {
      // skip
    }
  }
  return { orderId, txHash: receipt!.hash };
}
