/**
 * Shared types for AgentL2 Runtime
 */

// =============================================================================
// Agent Types
// =============================================================================

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  ownerAddress: string;
  
  // On-chain references
  onChainAddress: string | null;
  serviceId: string | null;
  
  // AI Configuration
  model: AIModel;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  
  // Tools and guardrails
  tools: AgentTool[];
  guardrails: AgentGuardrails;
  
  // Knowledge base (optional)
  knowledgeConfig: KnowledgeConfig | null;
  
  // Status
  status: AgentStatus;
  
  // Pricing
  pricePerRequest: string | null;
  
  // Stats
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensUsed: number;
  totalEarnings: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date | null;
}

export type AIModel = 
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307';

export type AgentStatus = 'draft' | 'active' | 'paused' | 'disabled';

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;  // JSON Schema
  handler: 'builtin' | 'webhook';
  webhookUrl?: string;
  webhookSecret?: string;  // Reference to secret key name
}

export interface AgentGuardrails {
  maxTokensPerRequest: number;
  maxRequestsPerMinute: number;
  blockedTopics: string[];
  requireHumanApproval: boolean;
  approvalThreshold?: number;  // 0-1 confidence score
}

export interface KnowledgeConfig {
  type: 'pinecone' | 'qdrant' | 'pgvector';
  indexName?: string;
  namespace?: string;
  topK?: number;
  minScore?: number;
}

// =============================================================================
// Order Types
// =============================================================================

export interface Order {
  id: string;
  
  // On-chain reference
  orderId: string;  // bytes32 from chain
  serviceId: string;
  
  // Parties
  agentId: string | null;
  buyerAddress: string;
  sellerAddress: string;
  
  // Payment
  priceWei: string;
  
  // Input
  inputData: OrderInput;
  inputHash: string | null;
  
  // Output
  resultData: OrderResult | null;
  resultUri: string | null;
  resultHash: string | null;
  
  // Execution
  status: OrderStatus;
  errorMessage: string | null;
  
  // Metrics
  startedAt: Date | null;
  completedAt: Date | null;
  tokensUsed: number | null;
  executionTimeMs: number | null;
  
  // On-chain tx
  completeTxHash: string | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  priority: number;
}

export type OrderStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface OrderInput {
  // User's request
  prompt: string;
  
  // Optional: conversation history for context
  messages?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  
  // Optional: additional parameters
  params?: Record<string, unknown>;
}

export interface OrderResult {
  // AI response
  response: string;
  
  // Tool calls made (if any)
  toolCalls?: Array<{
    tool: string;
    input: Record<string, unknown>;
    output: unknown;
  }>;
  
  // Metadata
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  
  // Guardrails info
  guardrailsApplied?: string[];
}

// =============================================================================
// Execution Log Types
// =============================================================================

export interface ExecutionLog {
  id: string;
  agentId: string | null;
  orderId: string | null;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// =============================================================================
// API Types
// =============================================================================

export interface CreateAgentRequest {
  name: string;
  description?: string;
  ownerAddress: string;
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt: string;
  tools?: AgentTool[];
  guardrails?: Partial<AgentGuardrails>;
  knowledgeConfig?: KnowledgeConfig;
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: AgentTool[];
  guardrails?: Partial<AgentGuardrails>;
  knowledgeConfig?: KnowledgeConfig;
  status?: AgentStatus;
}

export interface StoreSecretRequest {
  key: string;
  value: string;
}

// =============================================================================
// Event Types (from blockchain)
// =============================================================================

export interface OrderCreatedEvent {
  orderId: string;
  serviceId: string;
  buyer: string;
  seller: string;
  totalPrice: bigint;
  inputHash: string;
  blockNumber: number;
  transactionHash: string;
}
