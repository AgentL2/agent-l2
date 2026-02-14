/**
 * AgentL2 Runtime
 * The main engine that runs autonomous agents
 * - Polls for new orders
 * - Executes tasks using registered executors
 * - Submits results and proofs on-chain
 * - Handles failures and retries
 */

import { ethers, Contract, Wallet } from 'ethers';
import type {
  RuntimeConfig,
  TaskInput,
  TaskResult,
  Executor,
  RuntimeEvent,
  EventCallback,
  ResultStorage,
} from './types.js';
import { ExecutorRegistry, OpenAIExecutor } from './executors/index.js';
import { LocalStorage, IPFSStorage } from './storage.js';
import { ProofGenerator } from './proof.js';

// Contract ABIs (minimal)
const REGISTRY_ABI = [
  'function agents(address) view returns (address owner, string did, string metadataURI, uint256 reputationScore, uint256 totalEarned, uint256 totalSpent, uint256 registeredAt, bool active)',
  'function services(bytes32) view returns (address agent, string serviceType, uint256 pricePerUnit, string metadataURI, bool active)',
  'function getAgentServices(address agent) view returns (bytes32[])',
  'function isActiveAgent(address agent) view returns (bool)',
];

const MARKETPLACE_ABI = [
  'function orders(bytes32) view returns (bytes32 serviceId, address buyer, address seller, uint256 units, uint256 totalPrice, uint256 createdAt, uint256 deadline, uint8 status, string resultURI, bytes resultHash)',
  'function getAgentOrders(address agent) view returns (bytes32[])',
  'function completeOrder(bytes32 orderId, string resultURI, bytes resultHash)',
  'event OrderCreated(bytes32 indexed orderId, bytes32 indexed serviceId, address buyer, address seller, uint256 totalPrice)',
  'event OrderCompleted(bytes32 indexed orderId, string resultURI)',
];

enum OrderStatus {
  Pending = 0,
  Completed = 1,
  Disputed = 2,
  Cancelled = 3,
  Refunded = 4,
  DisputeResolved = 5,
}

export class AgentRuntime {
  private config: RuntimeConfig;
  private wallet: Wallet;
  private provider: ethers.JsonRpcProvider;
  private registry: Contract;
  private marketplace: Contract;
  private executors: ExecutorRegistry;
  private storage: ResultStorage;
  private proofGenerator: ProofGenerator;
  private eventCallbacks: EventCallback[] = [];
  
  private running = false;
  private pollTimer?: ReturnType<typeof setInterval>;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private processingOrders = new Set<string>();
  private processedOrders = new Set<string>();
  private processedOrdersFile: string;

  constructor(config: RuntimeConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new Wallet(config.privateKey, this.provider);
    this.registry = new Contract(config.contracts.registry, REGISTRY_ABI, this.wallet);
    this.marketplace = new Contract(config.contracts.marketplace, MARKETPLACE_ABI, this.wallet);
    this.executors = new ExecutorRegistry();
    this.proofGenerator = new ProofGenerator(config.privateKey);

    // Setup storage
    if (config.ipfsGateway) {
      this.storage = new IPFSStorage(config.ipfsGateway);
    } else {
      this.storage = new LocalStorage('./data/results');
    }

    // Load persisted processed orders
    this.processedOrdersFile = './data/processed-orders.json';
    this.loadProcessedOrders();

    // Register default executors
    if (config.openaiApiKey) {
      this.executors.register(new OpenAIExecutor({
        privateKey: config.privateKey,
        apiKey: config.openaiApiKey,
      }));
    }

    // Register custom executors
    if (config.executors) {
      for (const executor of config.executors) {
        this.executors.register(executor);
      }
    }
  }

  get address(): string {
    return this.wallet.address;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Start the runtime
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[Runtime] Already running');
      return;
    }

    console.log('\n===========================================');
    console.log('  AgentL2 Runtime Starting');
    console.log('===========================================\n');
    console.log(`Agent Address: ${this.address}`);
    console.log(`RPC URL: ${this.config.rpcUrl}`);
    console.log(`Registry: ${this.config.contracts.registry}`);
    console.log(`Marketplace: ${this.config.contracts.marketplace}`);
    console.log(`Poll Interval: ${this.config.pollInterval ?? 5000}ms`);
    console.log(`Max Concurrent: ${this.config.maxConcurrent ?? 5}`);
    console.log(`Auto Complete: ${this.config.autoComplete ?? true}`);
    console.log('');

    // Verify agent is registered
    const isActive = await this.registry.isActiveAgent(this.address);
    if (!isActive) {
      console.warn('[Runtime] Warning: Agent is not registered or not active');
      console.warn('         Register your agent first using the SDK');
    }

    // List registered executors
    const executorList = this.executors.list();
    console.log(`Registered Executors (${executorList.length}):`);
    for (const executor of executorList) {
      console.log(`  - ${executor.name} [${executor.serviceTypes.join(', ')}]`);
    }
    console.log('');

    this.running = true;
    this.emit({ type: 'started', agentAddress: this.address });

    // Start listening for events
    this.startEventListener();

    // Start polling for orders
    this.startPolling();

    // Start heartbeat for dashboard
    this.startHeartbeat();

    // Process any existing pending orders
    await this.processExistingOrders();

    console.log('[Runtime] Started and listening for orders\n');
  }

  /**
   * Stop the runtime
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    console.log('[Runtime] Stopping...');
    this.running = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    this.marketplace.removeAllListeners();

    // Wait for processing orders to complete
    while (this.processingOrders.size > 0) {
      console.log(`[Runtime] Waiting for ${this.processingOrders.size} orders to complete...`);
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log('[Runtime] Stopped');
  }

  // ============================================================================
  // Order Processing
  // ============================================================================

  private startEventListener(): void {
    this.marketplace.on(
      'OrderCreated',
      async (orderId: string, serviceId: string, buyer: string, seller: string, totalPrice: bigint) => {
        // Only process orders for this agent
        if (seller.toLowerCase() !== this.address.toLowerCase()) return;

        console.log(`[Event] New order received: ${orderId.slice(0, 10)}...`);
        this.emit({ type: 'order_received', orderId, serviceType: 'pending' });

        // Process the order
        await this.processOrder(orderId);
      }
    );
  }

  private startPolling(): void {
    const interval = this.config.pollInterval ?? 5000;
    this.pollTimer = setInterval(async () => {
      if (!this.running) return;
      await this.pollOrders();
    }, interval);
  }

  private startHeartbeat(): void {
    // Send heartbeat every 30 seconds to keep dashboard status fresh
    if (!this.config.webhookUrl) return;

    const sendHeartbeat = async () => {
      try {
        const status = await this.getStatus();
        await fetch(this.config.webhookUrl!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: this.address,
            status: {
              ...status,
              config: {
                pollInterval: this.config.pollInterval ?? 5000,
                maxConcurrent: this.config.maxConcurrent ?? 5,
                autoComplete: this.config.autoComplete ?? true,
                hasOpenAI: !!this.config.openaiApiKey,
                executorCount: this.executors.list().length,
              },
            },
          }),
        });
      } catch {
        // Ignore heartbeat errors
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Then every 30 seconds
    this.heartbeatTimer = setInterval(sendHeartbeat, 30000);
  }

  private async pollOrders(): Promise<void> {
    try {
      const orderIds = await this.marketplace.getAgentOrders(this.address);
      
      for (const orderId of orderIds) {
        if (this.processedOrders.has(orderId)) continue;
        if (this.processingOrders.has(orderId)) continue;

        const order = await this.marketplace.orders(orderId);
        if (Number(order.status) === OrderStatus.Pending) {
          await this.processOrder(orderId);
        } else {
          this.processedOrders.add(orderId);
          this.persistProcessedOrders();
        }
      }
    } catch (error) {
      console.error('[Runtime] Poll error:', error);
    }
  }

  private async processExistingOrders(): Promise<void> {
    console.log('[Runtime] Checking for existing pending orders...');
    
    try {
      const orderIds = await this.marketplace.getAgentOrders(this.address);
      let pendingCount = 0;

      for (const orderId of orderIds) {
        const order = await this.marketplace.orders(orderId);
        if (Number(order.status) === OrderStatus.Pending) {
          pendingCount++;
          // Don't await - process in background
          this.processOrder(orderId);
        } else {
          this.processedOrders.add(orderId);
          this.persistProcessedOrders();
        }
      }

      console.log(`[Runtime] Found ${pendingCount} pending orders`);
    } catch (error) {
      console.error('[Runtime] Error checking existing orders:', error);
    }
  }

  private async processOrder(orderId: string): Promise<void> {
    // Check concurrency limit
    const maxConcurrent = this.config.maxConcurrent ?? 5;
    if (this.processingOrders.size >= maxConcurrent) {
      console.log(`[Runtime] Max concurrent reached, queueing order ${orderId.slice(0, 10)}...`);
      return;
    }

    if (this.processingOrders.has(orderId) || this.processedOrders.has(orderId)) {
      return;
    }

    this.processingOrders.add(orderId);

    try {
      // Fetch order details
      const order = await this.marketplace.orders(orderId);
      
      if (Number(order.status) !== OrderStatus.Pending) {
        console.log(`[Runtime] Order ${orderId.slice(0, 10)}... is not pending, skipping`);
        this.processedOrders.add(orderId);
        this.persistProcessedOrders();
        return;
      }

      // Check deadline
      const deadline = Number(order.deadline);
      if (Date.now() / 1000 > deadline) {
        console.log(`[Runtime] Order ${orderId.slice(0, 10)}... has passed deadline, skipping`);
        this.processedOrders.add(orderId);
        this.persistProcessedOrders();
        return;
      }

      // Get service details
      const service = await this.registry.services(order.serviceId);
      const serviceType = service.serviceType;

      console.log(`[Runtime] Processing order ${orderId.slice(0, 10)}...`);
      console.log(`  Service: ${serviceType}`);
      console.log(`  Price: ${ethers.formatEther(order.totalPrice)} ETH`);
      console.log(`  Units: ${order.units}`);

      // Find executor
      const executor = this.executors.findExecutor(serviceType);
      if (!executor) {
        console.error(`[Runtime] No executor found for service type: ${serviceType}`);
        this.emit({ type: 'execution_failed', orderId, error: `No executor for ${serviceType}` });
        return;
      }

      console.log(`  Executor: ${executor.name}`);
      this.emit({ type: 'execution_started', orderId, executorId: executor.id });

      // Build task input
      const task: TaskInput = {
        orderId,
        serviceId: order.serviceId,
        serviceType,
        buyer: order.buyer,
        units: order.units,
        totalPrice: order.totalPrice,
        deadline,
        payload: await this.fetchOrderPayload(order.serviceId, service.metadataURI),
      };

      // Execute task
      const result = await executor.execute(task);

      if (!result.success) {
        console.error(`[Runtime] Execution failed: ${result.error}`);
        this.emit({ type: 'execution_failed', orderId, error: result.error ?? 'Unknown error' });
        return;
      }

      console.log(`[Runtime] Execution completed in ${result.metadata.durationMs}ms`);
      this.emit({ type: 'execution_completed', orderId, result });

      // Store result
      const resultData = {
        orderId,
        serviceType,
        input: task.payload ?? {},
        output: { resultHash: Buffer.from(result.resultHash).toString('hex') },
        proof: result.proof,
        metadata: result.metadata,
      };
      const resultURI = await this.storage.store(resultData);
      result.resultURI = resultURI;

      console.log(`[Runtime] Result stored: ${resultURI}`);

      // Complete order on-chain
      if (this.config.autoComplete !== false) {
        await this.completeOrderOnChain(orderId, resultURI, result.resultHash);
      }

      this.processedOrders.add(orderId);
      this.persistProcessedOrders();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Runtime] Error processing order ${orderId.slice(0, 10)}...:`, message);
      this.emit({ type: 'execution_failed', orderId, error: message });
    } finally {
      this.processingOrders.delete(orderId);
    }
  }

  private async completeOrderOnChain(orderId: string, resultURI: string, resultHash: Uint8Array): Promise<void> {
    try {
      console.log(`[Runtime] Completing order on-chain...`);
      const tx = await this.marketplace.completeOrder(orderId, resultURI, resultHash);
      const receipt = await tx.wait(1);
      console.log(`[Runtime] Order completed! TX: ${receipt.hash}`);
      this.emit({ type: 'order_completed', orderId, txHash: receipt.hash });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Runtime] Failed to complete order on-chain: ${message}`);
      this.emit({ type: 'error', error: `Failed to complete order: ${message}` });
    }
  }

  private async fetchOrderPayload(serviceId: string, metadataURI: string): Promise<Record<string, unknown>> {
    // Try to fetch payload from metadata URI
    if (!metadataURI || metadataURI === '') {
      return {};
    }

    try {
      if (metadataURI.startsWith('ipfs://')) {
        const cid = metadataURI.replace('ipfs://', '');
        const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
        if (response.ok) {
          return await response.json();
        }
      } else if (metadataURI.startsWith('http')) {
        const response = await fetch(metadataURI);
        if (response.ok) {
          return await response.json();
        }
      }
    } catch {
      // Ignore fetch errors
    }

    return {};
  }

  private loadProcessedOrders(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.processedOrdersFile)) {
        const data = JSON.parse(fs.readFileSync(this.processedOrdersFile, 'utf-8'));
        for (const id of data) {
          this.processedOrders.add(id);
        }
        console.log(`[Runtime] Loaded ${this.processedOrders.size} previously processed orders`);
      }
    } catch {
      // Ignore errors loading cache
    }
  }

  private persistProcessedOrders(): void {
    try {
      const fs = require('fs');
      const dir = require('path').dirname(this.processedOrdersFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.processedOrdersFile, JSON.stringify([...this.processedOrders]));
    } catch {
      // Ignore errors persisting cache
    }
  }

  // ============================================================================
  // Event System
  // ============================================================================

  /**
   * Subscribe to runtime events
   */
  on(callback: EventCallback): void {
    this.eventCallbacks.push(callback);
  }

  private emit(event: RuntimeEvent): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('[Runtime] Event callback error:', error);
      }
    }

    // Webhook notification
    if (this.config.webhookUrl) {
      this.notifyWebhook(event);
    }
  }

  private async notifyWebhook(event: RuntimeEvent): Promise<void> {
    try {
      // Send event with current status
      const status = await this.getStatus();
      await fetch(this.config.webhookUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: this.address,
          event,
          status: {
            ...status,
            config: {
              pollInterval: this.config.pollInterval ?? 5000,
              maxConcurrent: this.config.maxConcurrent ?? 5,
              autoComplete: this.config.autoComplete ?? true,
              hasOpenAI: !!this.config.openaiApiKey,
              executorCount: this.executors.list().length,
            },
          },
        }),
      });
    } catch {
      // Ignore webhook errors
    }
  }

  // ============================================================================
  // Executor Management
  // ============================================================================

  /**
   * Register a custom executor
   */
  registerExecutor(executor: Executor): void {
    this.executors.register(executor);
  }

  /**
   * Get executor registry
   */
  getExecutors(): ExecutorRegistry {
    return this.executors;
  }

  // ============================================================================
  // Health & Status
  // ============================================================================

  /**
   * Get runtime status
   */
  async getStatus(): Promise<{
    running: boolean;
    address: string;
    isRegistered: boolean;
    processingOrders: number;
    processedOrders: number;
    executors: { id: string; name: string; healthy: boolean }[];
  }> {
    const isRegistered = await this.registry.isActiveAgent(this.address);
    const healthResults = await this.executors.healthCheck();

    return {
      running: this.running,
      address: this.address,
      isRegistered,
      processingOrders: this.processingOrders.size,
      processedOrders: this.processedOrders.size,
      executors: this.executors.list().map((e) => ({
        id: e.id,
        name: e.name,
        healthy: healthResults.get(e.id) ?? false,
      })),
    };
  }
}
