/**
 * AgentL2 Runtime Types
 * Core type definitions for autonomous agent execution
 */

// ============================================================================
// Task & Execution Types
// ============================================================================

export interface TaskInput {
  orderId: string;
  serviceId: string;
  serviceType: string;
  buyer: string;
  units: bigint;
  totalPrice: bigint;
  deadline: number;
  /** Arbitrary input data from the order metadata */
  payload?: Record<string, unknown>;
}

export interface TaskResult {
  /** Success or failure */
  success: boolean;
  /** URI where result is stored (IPFS, HTTP, etc.) */
  resultURI: string;
  /** Hash of the result for verification */
  resultHash: Uint8Array;
  /** Proof of work data */
  proof: ProofOfWork;
  /** Optional error message if failed */
  error?: string;
  /** Execution metadata */
  metadata: ExecutionMetadata;
}

export interface ExecutionMetadata {
  startTime: number;
  endTime: number;
  durationMs: number;
  executorId: string;
  executorVersion: string;
  modelUsed?: string;
  tokensUsed?: number;
  computeUnits?: number;
}

// ============================================================================
// Proof of Work Types
// ============================================================================

export interface ProofOfWork {
  /** Type of proof */
  type: ProofType;
  /** Timestamp of execution */
  timestamp: number;
  /** Input hash (proves what input was processed) */
  inputHash: string;
  /** Output hash (proves what output was generated) */
  outputHash: string;
  /** Execution trace or evidence */
  evidence: ProofEvidence;
  /** Signature from the executor */
  signature: string;
}

export type ProofType = 
  | 'llm-completion'      // LLM API call with logged request/response
  | 'deterministic'       // Deterministic computation (reproducible)
  | 'tee-attestation'     // Trusted Execution Environment attestation
  | 'multi-party'         // Multiple agents verified same result
  | 'oracle-verified';    // External oracle validated result

export interface ProofEvidence {
  /** For LLM proofs: API request/response hashes */
  apiCallHash?: string;
  /** For deterministic: seed and algorithm used */
  seed?: string;
  algorithm?: string;
  /** For TEE: attestation document */
  attestation?: string;
  /** For multi-party: list of verifier signatures */
  verifierSignatures?: string[];
  /** For oracle: oracle response */
  oracleResponse?: string;
  /** Raw evidence data (logged for disputes) */
  rawLog?: string;
}

// ============================================================================
// Executor Types
// ============================================================================

export interface Executor {
  /** Unique identifier for this executor type */
  id: string;
  /** Human-readable name */
  name: string;
  /** Version string */
  version: string;
  /** Service types this executor handles */
  serviceTypes: string[];
  /** Execute a task and return result */
  execute(task: TaskInput): Promise<TaskResult>;
  /** Estimate cost/time for a task (optional) */
  estimate?(task: TaskInput): Promise<ExecutionEstimate>;
  /** Health check */
  healthCheck(): Promise<boolean>;
}

export interface ExecutionEstimate {
  estimatedDurationMs: number;
  estimatedCost: bigint;
  confidence: number; // 0-1
}

// ============================================================================
// Runtime Configuration
// ============================================================================

export interface RuntimeConfig {
  /** Agent's private key */
  privateKey: string;
  /** L2 RPC URL */
  rpcUrl: string;
  /** Contract addresses */
  contracts: {
    registry: string;
    marketplace: string;
    bridge?: string;
  };
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number;
  /** Maximum concurrent tasks (default: 5) */
  maxConcurrent?: number;
  /** Auto-complete orders after execution (default: true) */
  autoComplete?: boolean;
  /** IPFS gateway for storing results */
  ipfsGateway?: string;
  /** OpenAI API key for LLM executors */
  openaiApiKey?: string;
  /** Custom executors to register */
  executors?: Executor[];
  /** Webhook URL for notifications */
  webhookUrl?: string;
  /** Health check port (default: 3050) */
  healthPort?: number;
}

// ============================================================================
// Events
// ============================================================================

export type RuntimeEvent = 
  | { type: 'started'; agentAddress: string }
  | { type: 'order_received'; orderId: string; serviceType: string }
  | { type: 'execution_started'; orderId: string; executorId: string }
  | { type: 'execution_completed'; orderId: string; result: TaskResult }
  | { type: 'execution_failed'; orderId: string; error: string }
  | { type: 'order_completed'; orderId: string; txHash: string }
  | { type: 'error'; error: string };

export type EventCallback = (event: RuntimeEvent) => void | Promise<void>;

// ============================================================================
// Storage Types
// ============================================================================

export interface ResultStorage {
  /** Store result and return URI */
  store(data: ResultData): Promise<string>;
  /** Retrieve result by URI */
  retrieve(uri: string): Promise<ResultData | null>;
}

export interface ResultData {
  orderId: string;
  serviceType: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  proof: ProofOfWork;
  metadata: ExecutionMetadata;
}
