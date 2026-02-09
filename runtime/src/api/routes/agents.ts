/**
 * Agent API Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import * as db from '../../shared/db.js';
import { encrypt, decrypt } from '../../shared/crypto.js';
import type { CreateAgentRequest, UpdateAgentRequest } from '../../shared/types.js';

export const agentRoutes = Router();

// Validation schemas
const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  ownerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  model: z.enum(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']).optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(128000).optional(),
  systemPrompt: z.string().min(1),
  tools: z.array(z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.record(z.unknown()),
    handler: z.enum(['builtin', 'webhook']),
    webhookUrl: z.string().url().optional(),
  })).optional(),
  guardrails: z.object({
    maxTokensPerRequest: z.number().int().optional(),
    maxRequestsPerMinute: z.number().int().optional(),
    blockedTopics: z.array(z.string()).optional(),
    requireHumanApproval: z.boolean().optional(),
    approvalThreshold: z.number().min(0).max(1).optional(),
  }).optional(),
  knowledgeConfig: z.object({
    type: z.enum(['pinecone', 'qdrant', 'pgvector']),
    indexName: z.string().optional(),
    namespace: z.string().optional(),
    topK: z.number().int().optional(),
    minScore: z.number().optional(),
  }).optional(),
});

const updateAgentSchema = createAgentSchema.partial().omit({ ownerAddress: true }).extend({
  status: z.enum(['draft', 'active', 'paused', 'disabled']).optional(),
});

const storeSecretSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1),
});

// =============================================================================
// Routes
// =============================================================================

// List agents for an owner
agentRoutes.get('/', async (req, res) => {
  try {
    const owner = req.query.owner as string;
    if (!owner || !/^0x[a-fA-F0-9]{40}$/.test(owner)) {
      return res.status(400).json({ error: 'Valid owner address required' });
    }
    
    const agents = await db.getAgentsByOwner(owner);
    res.json({ agents });
  } catch (err) {
    console.error('Error fetching agents:', err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get single agent
agentRoutes.get('/:id', async (req, res) => {
  try {
    const agent = await db.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (err) {
    console.error('Error fetching agent:', err);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Create agent
agentRoutes.post('/', async (req, res) => {
  try {
    const parsed = createAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }
    
    const agent = await db.createAgent(parsed.data as CreateAgentRequest);
    res.status(201).json(agent);
  } catch (err) {
    console.error('Error creating agent:', err);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Update agent
agentRoutes.patch('/:id', async (req, res) => {
  try {
    const parsed = updateAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }
    
    const agent = await db.updateAgent(req.params.id, parsed.data as UpdateAgentRequest);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (err) {
    console.error('Error updating agent:', err);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete agent
agentRoutes.delete('/:id', async (req, res) => {
  try {
    const deleted = await db.deleteAgent(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting agent:', err);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// =============================================================================
// Secrets
// =============================================================================

// List secret keys (not values)
agentRoutes.get('/:id/secrets', async (req, res) => {
  try {
    const agent = await db.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const keys = await db.getAgentSecretKeys(req.params.id);
    res.json({ keys });
  } catch (err) {
    console.error('Error fetching secrets:', err);
    res.status(500).json({ error: 'Failed to fetch secrets' });
  }
});

// Store a secret
agentRoutes.post('/:id/secrets', async (req, res) => {
  try {
    const agent = await db.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const parsed = storeSecretSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.issues });
    }
    
    const encrypted = encrypt(parsed.data.value);
    await db.storeAgentSecret(req.params.id, parsed.data.key, encrypted);
    
    res.status(201).json({ message: 'Secret stored', key: parsed.data.key });
  } catch (err) {
    console.error('Error storing secret:', err);
    res.status(500).json({ error: 'Failed to store secret' });
  }
});

// Delete a secret
agentRoutes.delete('/:id/secrets/:key', async (req, res) => {
  try {
    const deleted = await db.deleteAgentSecret(req.params.id, req.params.key);
    if (!deleted) {
      return res.status(404).json({ error: 'Secret not found' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting secret:', err);
    res.status(500).json({ error: 'Failed to delete secret' });
  }
});

// =============================================================================
// Logs
// =============================================================================

agentRoutes.get('/:id/logs', async (req, res) => {
  try {
    const agent = await db.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const logs = await db.getAgentLogs(req.params.id, limit);
    res.json({ logs });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// =============================================================================
// Orders for this agent
// =============================================================================

agentRoutes.get('/:id/orders', async (req, res) => {
  try {
    const agent = await db.getAgentById(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const orders = await db.getOrdersByAgent(req.params.id, limit);
    res.json({ orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});
