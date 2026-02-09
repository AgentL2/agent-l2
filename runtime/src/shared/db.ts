/**
 * Database connection and queries
 */

import pg from 'pg';
import { pino } from 'pino';
import type { Agent, Order, ExecutionLog, CreateAgentRequest, UpdateAgentRequest } from './types.js';

const logger = pino({ name: 'db' });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

// =============================================================================
// Agent Queries
// =============================================================================

export async function getAgentById(id: string): Promise<Agent | null> {
  const result = await pool.query(
    `SELECT * FROM agents WHERE id = $1`,
    [id]
  );
  return result.rows[0] ? rowToAgent(result.rows[0]) : null;
}

export async function getAgentByServiceId(serviceId: string): Promise<Agent | null> {
  const result = await pool.query(
    `SELECT * FROM agents WHERE service_id = $1`,
    [serviceId]
  );
  return result.rows[0] ? rowToAgent(result.rows[0]) : null;
}

export async function getAgentsByOwner(ownerAddress: string): Promise<Agent[]> {
  const result = await pool.query(
    `SELECT * FROM agents WHERE owner_address = $1 ORDER BY created_at DESC`,
    [ownerAddress.toLowerCase()]
  );
  return result.rows.map(rowToAgent);
}

export async function createAgent(req: CreateAgentRequest): Promise<Agent> {
  const result = await pool.query(
    `INSERT INTO agents (
      name, description, owner_address, model, temperature, max_tokens,
      system_prompt, tools, guardrails, knowledge_config, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
    RETURNING *`,
    [
      req.name,
      req.description || null,
      req.ownerAddress.toLowerCase(),
      req.model || 'gpt-4o-mini',
      req.temperature ?? 0.7,
      req.maxTokens ?? 4096,
      req.systemPrompt,
      JSON.stringify(req.tools || []),
      JSON.stringify({
        maxTokensPerRequest: 4096,
        maxRequestsPerMinute: 60,
        blockedTopics: [],
        requireHumanApproval: false,
        ...req.guardrails,
      }),
      req.knowledgeConfig ? JSON.stringify(req.knowledgeConfig) : null,
    ]
  );
  return rowToAgent(result.rows[0]);
}

export async function updateAgent(id: string, req: UpdateAgentRequest): Promise<Agent | null> {
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (req.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(req.name);
  }
  if (req.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(req.description);
  }
  if (req.model !== undefined) {
    updates.push(`model = $${paramIndex++}`);
    values.push(req.model);
  }
  if (req.temperature !== undefined) {
    updates.push(`temperature = $${paramIndex++}`);
    values.push(req.temperature);
  }
  if (req.maxTokens !== undefined) {
    updates.push(`max_tokens = $${paramIndex++}`);
    values.push(req.maxTokens);
  }
  if (req.systemPrompt !== undefined) {
    updates.push(`system_prompt = $${paramIndex++}`);
    values.push(req.systemPrompt);
  }
  if (req.tools !== undefined) {
    updates.push(`tools = $${paramIndex++}`);
    values.push(JSON.stringify(req.tools));
  }
  if (req.guardrails !== undefined) {
    updates.push(`guardrails = guardrails || $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(req.guardrails));
  }
  if (req.knowledgeConfig !== undefined) {
    updates.push(`knowledge_config = $${paramIndex++}`);
    values.push(req.knowledgeConfig ? JSON.stringify(req.knowledgeConfig) : null);
  }
  if (req.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(req.status);
  }

  if (updates.length === 0) {
    return getAgentById(id);
  }

  values.push(id);
  const result = await pool.query(
    `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] ? rowToAgent(result.rows[0]) : null;
}

export async function deleteAgent(id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM agents WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateAgentStats(
  id: string,
  stats: { tokensUsed?: number; success?: boolean; earnings?: string }
): Promise<void> {
  const updates: string[] = ['last_active_at = NOW()'];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (stats.tokensUsed !== undefined) {
    updates.push(`total_tokens_used = total_tokens_used + $${paramIndex++}`);
    values.push(stats.tokensUsed);
  }
  if (stats.success !== undefined) {
    updates.push(`total_requests = total_requests + 1`);
    if (stats.success) {
      updates.push(`successful_requests = successful_requests + 1`);
    } else {
      updates.push(`failed_requests = failed_requests + 1`);
    }
  }
  if (stats.earnings !== undefined) {
    updates.push(`total_earnings = (total_earnings::numeric + $${paramIndex++}::numeric)::text`);
    values.push(stats.earnings);
  }

  values.push(id);
  await pool.query(
    `UPDATE agents SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

// =============================================================================
// Secret Queries
// =============================================================================

export async function getAgentSecretKeys(agentId: string): Promise<string[]> {
  const result = await pool.query(
    `SELECT key_name FROM agent_secrets WHERE agent_id = $1`,
    [agentId]
  );
  return result.rows.map((r) => r.key_name);
}

export async function getAgentSecret(agentId: string, keyName: string): Promise<Buffer | null> {
  const result = await pool.query(
    `SELECT encrypted_value FROM agent_secrets WHERE agent_id = $1 AND key_name = $2`,
    [agentId, keyName]
  );
  return result.rows[0]?.encrypted_value || null;
}

export async function storeAgentSecret(
  agentId: string,
  keyName: string,
  encryptedValue: Buffer
): Promise<void> {
  await pool.query(
    `INSERT INTO agent_secrets (agent_id, key_name, encrypted_value)
     VALUES ($1, $2, $3)
     ON CONFLICT (agent_id, key_name) DO UPDATE SET encrypted_value = $3, updated_at = NOW()`,
    [agentId, keyName, encryptedValue]
  );
}

export async function deleteAgentSecret(agentId: string, keyName: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM agent_secrets WHERE agent_id = $1 AND key_name = $2`,
    [agentId, keyName]
  );
  return (result.rowCount ?? 0) > 0;
}

// =============================================================================
// Order Queries
// =============================================================================

export async function getOrderById(id: string): Promise<Order | null> {
  const result = await pool.query(`SELECT * FROM orders WHERE id = $1`, [id]);
  return result.rows[0] ? rowToOrder(result.rows[0]) : null;
}

export async function getOrderByChainId(orderId: string): Promise<Order | null> {
  const result = await pool.query(`SELECT * FROM orders WHERE order_id = $1`, [orderId]);
  return result.rows[0] ? rowToOrder(result.rows[0]) : null;
}

export async function getOrdersByAgent(agentId: string, limit = 50): Promise<Order[]> {
  const result = await pool.query(
    `SELECT * FROM orders WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [agentId, limit]
  );
  return result.rows.map(rowToOrder);
}

export async function createOrder(order: {
  orderId: string;
  serviceId: string;
  agentId: string | null;
  buyerAddress: string;
  sellerAddress: string;
  priceWei: string;
  inputData: object;
  inputHash: string | null;
}): Promise<Order> {
  const result = await pool.query(
    `INSERT INTO orders (
      order_id, service_id, agent_id, buyer_address, seller_address,
      price_wei, input_data, input_hash, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
    RETURNING *`,
    [
      order.orderId,
      order.serviceId,
      order.agentId,
      order.buyerAddress.toLowerCase(),
      order.sellerAddress.toLowerCase(),
      order.priceWei,
      JSON.stringify(order.inputData),
      order.inputHash,
    ]
  );
  return rowToOrder(result.rows[0]);
}

export async function updateOrderStatus(
  id: string,
  status: string,
  extra?: {
    errorMessage?: string;
    resultData?: object;
    resultUri?: string;
    resultHash?: string;
    tokensUsed?: number;
    executionTimeMs?: number;
    completeTxHash?: string;
  }
): Promise<void> {
  const updates = ['status = $2'];
  const values: unknown[] = [id, status];
  let paramIndex = 3;

  if (status === 'processing') {
    updates.push(`started_at = NOW()`);
  }
  if (status === 'completed' || status === 'failed') {
    updates.push(`completed_at = NOW()`);
  }
  if (extra?.errorMessage !== undefined) {
    updates.push(`error_message = $${paramIndex++}`);
    values.push(extra.errorMessage);
  }
  if (extra?.resultData !== undefined) {
    updates.push(`result_data = $${paramIndex++}`);
    values.push(JSON.stringify(extra.resultData));
  }
  if (extra?.resultUri !== undefined) {
    updates.push(`result_uri = $${paramIndex++}`);
    values.push(extra.resultUri);
  }
  if (extra?.resultHash !== undefined) {
    updates.push(`result_hash = $${paramIndex++}`);
    values.push(extra.resultHash);
  }
  if (extra?.tokensUsed !== undefined) {
    updates.push(`tokens_used = $${paramIndex++}`);
    values.push(extra.tokensUsed);
  }
  if (extra?.executionTimeMs !== undefined) {
    updates.push(`execution_time_ms = $${paramIndex++}`);
    values.push(extra.executionTimeMs);
  }
  if (extra?.completeTxHash !== undefined) {
    updates.push(`complete_tx_hash = $${paramIndex++}`);
    values.push(extra.completeTxHash);
  }

  await pool.query(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = $1`,
    values
  );
}

export async function getPendingOrders(limit = 10): Promise<Order[]> {
  const result = await pool.query(
    `SELECT * FROM orders 
     WHERE status = 'pending' 
     ORDER BY priority DESC, created_at ASC 
     LIMIT $1
     FOR UPDATE SKIP LOCKED`,
    [limit]
  );
  return result.rows.map(rowToOrder);
}

// =============================================================================
// Log Queries
// =============================================================================

export async function createLog(log: {
  agentId?: string;
  orderId?: string;
  level: string;
  message: string;
  metadata?: object;
}): Promise<void> {
  await pool.query(
    `INSERT INTO execution_logs (agent_id, order_id, level, message, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      log.agentId || null,
      log.orderId || null,
      log.level,
      log.message,
      log.metadata ? JSON.stringify(log.metadata) : null,
    ]
  );
}

export async function getAgentLogs(agentId: string, limit = 100): Promise<ExecutionLog[]> {
  const result = await pool.query(
    `SELECT * FROM execution_logs WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [agentId, limit]
  );
  return result.rows.map(rowToLog);
}

// =============================================================================
// Helpers
// =============================================================================

function rowToAgent(row: Record<string, unknown>): Agent {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    ownerAddress: row.owner_address as string,
    onChainAddress: row.on_chain_address as string | null,
    serviceId: row.service_id as string | null,
    model: row.model as Agent['model'],
    temperature: parseFloat(row.temperature as string),
    maxTokens: row.max_tokens as number,
    systemPrompt: row.system_prompt as string,
    tools: row.tools as Agent['tools'],
    guardrails: row.guardrails as Agent['guardrails'],
    knowledgeConfig: row.knowledge_config as Agent['knowledgeConfig'],
    status: row.status as Agent['status'],
    pricePerRequest: row.price_per_request as string | null,
    totalRequests: row.total_requests as number,
    successfulRequests: row.successful_requests as number,
    failedRequests: row.failed_requests as number,
    totalTokensUsed: parseInt(row.total_tokens_used as string, 10),
    totalEarnings: row.total_earnings as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    lastActiveAt: row.last_active_at ? new Date(row.last_active_at as string) : null,
  };
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    orderId: row.order_id as string,
    serviceId: row.service_id as string,
    agentId: row.agent_id as string | null,
    buyerAddress: row.buyer_address as string,
    sellerAddress: row.seller_address as string,
    priceWei: row.price_wei as string,
    inputData: row.input_data as Order['inputData'],
    inputHash: row.input_hash as string | null,
    resultData: row.result_data as Order['resultData'],
    resultUri: row.result_uri as string | null,
    resultHash: row.result_hash as string | null,
    status: row.status as Order['status'],
    errorMessage: row.error_message as string | null,
    startedAt: row.started_at ? new Date(row.started_at as string) : null,
    completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
    tokensUsed: row.tokens_used as number | null,
    executionTimeMs: row.execution_time_ms as number | null,
    completeTxHash: row.complete_tx_hash as string | null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    priority: row.priority as number,
  };
}

function rowToLog(row: Record<string, unknown>): ExecutionLog {
  return {
    id: row.id as string,
    agentId: row.agent_id as string | null,
    orderId: row.order_id as string | null,
    level: row.level as ExecutionLog['level'],
    message: row.message as string,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: new Date(row.created_at as string),
  };
}

export { pool };
