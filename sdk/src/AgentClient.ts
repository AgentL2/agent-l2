import { ethers, Wallet, Contract, Provider, Interface } from 'ethers';

export interface AgentConfig {
  privateKey: string;
  rpcUrl: string;
  registryAddress: string;
  marketplaceAddress: string;
  /** Optional: for bridge balance and withdrawals */
  bridgeAddress?: string;
  /** Optional: chain ID (default from provider). Used for 0-conf on local (1337). */
  chainId?: number;
}

export interface AgentIdentity {
  address: string;
  did: string;
  metadataURI: string;
  reputationScore: number;
  totalEarned: bigint;
  totalSpent: bigint;
}

export interface Service {
  serviceId: string;
  serviceType: string;
  pricePerUnit: bigint;
  metadataURI: string;
  active: boolean;
}

export interface ServiceOrder {
  orderId: string;
  serviceId: string;
  buyer: string;
  seller: string;
  units: bigint;
  totalPrice: bigint;
  status: number;
  resultURI: string;
}

const REGISTRY_ABI = [
  'function registerAgent(address agent, string did, string metadataURI)',
  'function updateAgent(address agent, string metadataURI)',
  'function registerService(address agent, string serviceType, uint256 pricePerUnit, string metadataURI) returns (bytes32)',
  'function agents(address) view returns (address owner, string did, string metadataURI, uint256 reputationScore, uint256 totalEarned, uint256 totalSpent, uint256 registeredAt, bool active)',
  'function services(bytes32) view returns (address agent, string serviceType, uint256 pricePerUnit, string metadataURI, bool active)',
  'function getAgentServices(address agent) view returns (bytes32[])',
  'function isActiveAgent(address agent) view returns (bool)',
  'event ServiceRegistered(bytes32 indexed serviceId, address indexed agent, string serviceType)',
];

const MARKETPLACE_ABI = [
  'function createOrder(bytes32 serviceId, uint256 units, uint256 deadline) payable returns (bytes32)',
  'function completeOrder(bytes32 orderId, string resultURI, bytes resultHash)',
  'function disputeOrder(bytes32 orderId, string reason)',
  'function resolveDispute(bytes32 orderId, bool refundBuyer)',
  'function cancelOrder(bytes32 orderId)',
  'function startStream(address payee, uint256 ratePerSecond) payable returns (bytes32)',
  'function claimStream(bytes32 streamId)',
  'function stopStream(bytes32 streamId)',
  'function orders(bytes32) view returns (bytes32 serviceId, address buyer, address seller, uint256 units, uint256 totalPrice, uint256 createdAt, uint256 deadline, uint8 status, string resultURI, bytes resultHash)',
  'function getAgentOrders(address agent) view returns (bytes32[])',
  'event OrderCreated(bytes32 indexed orderId, bytes32 indexed serviceId, address buyer, address seller, uint256 totalPrice)',
  'event OrderCompleted(bytes32 indexed orderId, string resultURI)',
  'event StreamStarted(bytes32 indexed streamId, address indexed payer, address indexed payee, uint256 ratePerSecond)',
];

const BRIDGE_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function initiateWithdrawal(address l1Address, uint256 amount) returns (bytes32)',
  'event WithdrawalInitiated(bytes32 indexed withdrawalId, address indexed l2Address, address indexed l1Address, uint256 amount)',
];

/**
 * Parse event from receipt logs by name (ethers v6 compatible).
 */
function parseEvent(receipt: { logs: Array<{ topics: string[]; data: string }> }, iface: Interface, eventName: string): { [key: string]: unknown } | null {
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
      if (parsed && parsed.name === eventName) return parsed.args as unknown as { [key: string]: unknown };
    } catch {
      // skip unrelated logs
    }
  }
  return null;
}

/**
 * AgentClient - Main SDK for interacting with AgentL2
 */
export class AgentClient {
  private wallet: Wallet;
  private provider: Provider;
  private registry: Contract;
  private marketplace: Contract;
  private bridge: Contract | null = null;
  private chainId: number;
  private registryIface = new Interface(REGISTRY_ABI);
  private marketplaceIface = new Interface(MARKETPLACE_ABI);

  constructor(config: AgentConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);
    this.chainId = config.chainId ?? 0;
    this.registry = new Contract(config.registryAddress, REGISTRY_ABI, this.wallet);
    this.marketplace = new Contract(config.marketplaceAddress, MARKETPLACE_ABI, this.wallet);
    if (config.bridgeAddress) {
      this.bridge = new Contract(config.bridgeAddress, BRIDGE_ABI, this.wallet);
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        if (i === retries) throw err;
        const isTransient = err?.code === 'NETWORK_ERROR' || err?.code === 'TIMEOUT' ||
          err?.code === 'SERVER_ERROR' || err?.message?.includes('nonce');
        if (!isTransient) throw err;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
    throw new Error('Retry failed');
  }

  /** Resolve chain ID (for 0-conf on local). */
  private async getConfirmations(): Promise<number> {
    if (this.chainId === 1337) return 0;
    if (this.chainId !== 0) return 1;
    const net = await this.provider.getNetwork();
    return Number(net.chainId) === 1337 ? 0 : 1;
  }

  get address(): string {
    return this.wallet.address;
  }

  static generateDID(address: string): string {
    return `did:ethr:${address}`;
  }

  async register(metadataURI: string): Promise<string> {
    const did = AgentClient.generateDID(this.address);
    const tx = await this.registry.registerAgent(this.address, did, metadataURI);
    const confirmations = await this.getConfirmations();
    const receipt = await tx.wait(confirmations);
    console.log(`Agent registered: ${this.address}`);
    console.log(`DID: ${did}`);
    console.log(`Transaction: ${receipt!.hash}`);
    return did;
  }

  async updateMetadata(metadataURI: string): Promise<void> {
    const tx = await this.registry.updateAgent(this.address, metadataURI);
    const confirmations = await this.getConfirmations();
    await tx.wait(confirmations);
    console.log(`Metadata updated: ${metadataURI}`);
  }

  async getIdentity(agentAddress?: string): Promise<AgentIdentity> {
    const address = agentAddress || this.address;
    const agent = await this.registry.agents(address);
    return {
      address,
      did: agent.did,
      metadataURI: agent.metadataURI,
      reputationScore: Number(agent.reputationScore),
      totalEarned: agent.totalEarned,
      totalSpent: agent.totalSpent,
    };
  }

  async offerService(
    serviceType: string,
    pricePerUnit: bigint,
    metadataURI: string
  ): Promise<string> {
    const tx = await this.registry.registerService(this.address, serviceType, pricePerUnit, metadataURI);
    const confirmations = await this.getConfirmations();
    const receipt = await tx.wait(confirmations);
    const args = parseEvent(receipt!, this.registryIface, 'ServiceRegistered');
    const serviceId = (args?.serviceId as string) ?? '0x00';
    console.log(`Service registered: ${serviceId}`);
    console.log(`Type: ${serviceType}, Price: ${pricePerUnit} wei/unit`);
    return serviceId;
  }

  async getServices(agentAddress?: string): Promise<Service[]> {
    const address = agentAddress || this.address;
    const serviceIds = await this.registry.getAgentServices(address);
    const services: Service[] = [];
    for (const serviceId of serviceIds) {
      const service = await this.registry.services(serviceId);
      services.push({
        serviceId,
        serviceType: service.serviceType,
        pricePerUnit: service.pricePerUnit,
        metadataURI: service.metadataURI,
        active: service.active,
      });
    }
    return services;
  }

  async purchaseService(
    serviceId: string,
    units: bigint,
    deadlineSeconds: number = 3600
  ): Promise<string> {
    const service = await this.registry.services(serviceId);
    const totalPrice = service.pricePerUnit * units;
    const deadline = Math.floor(Date.now() / 1000) + deadlineSeconds;
    const tx = await this.marketplace.createOrder(serviceId, units, deadline, { value: totalPrice });
    const confirmations = await this.getConfirmations();
    const receipt = await tx.wait(confirmations);
    const args = parseEvent(receipt!, this.marketplaceIface, 'OrderCreated');
    const orderId = (args?.orderId as string) ?? '0x00';
    console.log(`Order created: ${orderId}`);
    console.log(`Total price: ${totalPrice} wei`);
    return orderId;
  }

  async completeOrder(orderId: string, resultURI: string, resultHash: Uint8Array): Promise<void> {
    const tx = await this.marketplace.completeOrder(orderId, resultURI, resultHash);
    const confirmations = await this.getConfirmations();
    await tx.wait(confirmations);
    console.log(`Order completed: ${orderId}`);
    console.log(`Result: ${resultURI}`);
  }

  /** Dispute an order (buyer only, while Pending). */
  async disputeOrder(orderId: string, reason: string): Promise<void> {
    const tx = await this.marketplace.disputeOrder(orderId, reason);
    const confirmations = await this.getConfirmations();
    await tx.wait(confirmations);
    console.log(`Order disputed: ${orderId}`);
  }

  /** Resolve a disputed order (fee collector only). Refund buyer or reject dispute. */
  async resolveDispute(orderId: string, refundBuyer: boolean): Promise<void> {
    const tx = await this.marketplace.resolveDispute(orderId, refundBuyer);
    const confirmations = await this.getConfirmations();
    await tx.wait(confirmations);
    console.log(`Dispute resolved: ${orderId}, refundBuyer=${refundBuyer}`);
  }

  /** Cancel a pending order (buyer only, before deadline). */
  async cancelOrder(orderId: string): Promise<void> {
    const tx = await this.marketplace.cancelOrder(orderId);
    const confirmations = await this.getConfirmations();
    await tx.wait(confirmations);
    console.log(`Order cancelled: ${orderId}`);
  }

  async startStream(
    payeeAddress: string,
    ratePerSecond: bigint,
    depositAmount: bigint
  ): Promise<string> {
    const tx = await this.marketplace.startStream(payeeAddress, ratePerSecond, { value: depositAmount });
    const confirmations = await this.getConfirmations();
    const receipt = await tx.wait(confirmations);
    const args = parseEvent(receipt!, this.marketplaceIface, 'StreamStarted');
    const streamId = (args?.streamId as string) ?? '0x00';
    console.log(`Stream started: ${streamId}`);
    console.log(`Rate: ${ratePerSecond} wei/second`);
    return streamId;
  }

  async claimStream(streamId: string): Promise<void> {
    const tx = await this.marketplace.claimStream(streamId);
    const confirmations = await this.getConfirmations();
    await tx.wait(confirmations);
    console.log(`Stream claimed: ${streamId}`);
  }

  async stopStream(streamId: string): Promise<void> {
    const tx = await this.marketplace.stopStream(streamId);
    const confirmations = await this.getConfirmations();
    await tx.wait(confirmations);
    console.log(`Stream stopped: ${streamId}`);
  }

  async getOrders(): Promise<ServiceOrder[]> {
    const orderIds = await this.marketplace.getAgentOrders(this.address);
    const orders: ServiceOrder[] = [];
    for (const orderId of orderIds) {
      const order = await this.marketplace.orders(orderId);
      orders.push({
        orderId,
        serviceId: order.serviceId,
        buyer: order.buyer,
        seller: order.seller,
        units: order.units,
        totalPrice: order.totalPrice,
        status: order.status,
        resultURI: order.resultURI,
      });
    }
    return orders;
  }

  /** L2 bridge balance (if bridgeAddress was set in config). */
  async getBridgeBalance(): Promise<bigint> {
    if (!this.bridge) throw new Error('Bridge not configured');
    return this.bridge.balanceOf(this.address);
  }

  /** Initiate L2 withdrawal to L1 (if bridge configured). Returns withdrawalId and txHash. */
  async initiateWithdrawal(l1Address: string, amountWei: bigint): Promise<{ withdrawalId: string; txHash: string }> {
    if (!this.bridge) throw new Error('Bridge not configured');
    const tx = await this.bridge.initiateWithdrawal(l1Address, amountWei);
    const confirmations = await this.getConfirmations();
    const receipt = await tx.wait(confirmations);
    const bridgeIface = new Interface(BRIDGE_ABI);
    let withdrawalId = '0x';
    for (const log of receipt!.logs) {
      try {
        const parsed = bridgeIface.parseLog({ topics: log.topics as string[], data: log.data });
        if (parsed && parsed.name === 'WithdrawalInitiated') {
          withdrawalId = parsed.args.withdrawalId as string;
          break;
        }
      } catch {
        // skip
      }
    }
    return { withdrawalId, txHash: receipt!.hash };
  }

  /** Listen for new orders where this agent is the seller. Calls callback(orderId, order). */
  async listenForOrders(callback: (orderId: string, order: { buyer: string; seller: string; units: bigint; totalPrice: bigint; status: number }) => void | Promise<void>): Promise<void> {
    this.marketplace.on('OrderCreated', async (orderId: string, _serviceId: string, _buyer: string, seller: string, _totalPrice: bigint) => {
      if (seller.toLowerCase() !== this.address.toLowerCase()) return;
      const order = await this.marketplace.orders(orderId);
      await Promise.resolve(callback(orderId, {
        buyer: order.buyer,
        seller: order.seller,
        units: order.units,
        totalPrice: order.totalPrice,
        status: order.status,
      }));
    });
    console.log(`Listening for orders to ${this.address}...`);
  }
}
