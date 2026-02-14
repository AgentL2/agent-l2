/**
 * Hosted Agents Store
 * In-memory store for MVP - would be replaced with database in production
 * 
 * Production would use:
 * - PostgreSQL for agent metadata
 * - Redis for runtime state
 * - Vault/KMS for secrets
 * - Kubernetes for orchestration
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), '.data');
const STORE_FILE = join(DATA_DIR, 'hosted-agents.json');

function loadStore(): Map<string, any> {
  try {
    if (existsSync(STORE_FILE)) {
      const data = JSON.parse(readFileSync(STORE_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch {
    // Ignore load errors
  }
  return new Map();
}

function saveStore(store: Map<string, any>): void {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_FILE, JSON.stringify(Object.fromEntries(store), null, 2));
  } catch {
    // Ignore save errors
  }
}

// ============================================================================
// Types
// ============================================================================

export interface HostedAgentData {
  id: string;
  address: string;       // Owner wallet address
  name: string;
  status: 'pending' | 'starting' | 'running' | 'paused' | 'error' | 'stopped';
  templateId: string;
  config: {
    pollInterval: number;
    maxConcurrent: number;
    autoComplete: boolean;
    templateConfig: Record<string, unknown>;
    secretsConfigured: string[];
  };
  stats: {
    totalOrders: number;
    completedOrders: number;
    failedOrders: number;
    totalEarnings: string;
    totalCost: string;
    uptime: number;
    lastActiveAt: number | null;
  };
  // Encrypted secrets (never exposed via API)
  encryptedSecrets: string;
  createdAt: number;
  updatedAt: number;
  startedAt: number | null;
  errorMessage: string | null;
}

export interface HostedAgentLog {
  id: string;
  agentId: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// In-Memory Store (MVP)
// ============================================================================

// Simple encryption key - in production use proper KMS
const ENCRYPTION_KEY = process.env.SECRETS_ENCRYPTION_KEY || 
  'agentl2-dev-key-replace-in-prod!!';

class HostedAgentsStore {
  private agents = loadStore() as Map<string, HostedAgentData>;
  private logs = new Map<string, HostedAgentLog[]>();
  private idCounter = 0;

  // ========== Agent CRUD ==========

  createAgent(data: Omit<HostedAgentData, 'id' | 'createdAt' | 'updatedAt' | 'startedAt' | 'errorMessage'>): HostedAgentData {
    const id = `hosted_${Date.now()}_${++this.idCounter}`;
    const now = Date.now();
    
    const agent: HostedAgentData = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
      startedAt: null,
      errorMessage: null,
    };

    this.agents.set(id, agent);
    saveStore(this.agents);
    this.logs.set(id, []);

    this.addLog(id, 'info', `Agent "${data.name}" created with template: ${data.templateId}`);
    
    return agent;
  }

  getAgent(id: string): HostedAgentData | null {
    return this.agents.get(id) || null;
  }

  getAgentsByOwner(address: string): HostedAgentData[] {
    const normalizedAddress = address.toLowerCase();
    return Array.from(this.agents.values())
      .filter(a => a.address.toLowerCase() === normalizedAddress)
      .map(a => this.sanitizeAgent(a));
  }

  updateAgent(id: string, updates: Partial<HostedAgentData>): HostedAgentData | null {
    const agent = this.agents.get(id);
    if (!agent) return null;

    const updated: HostedAgentData = {
      ...agent,
      ...updates,
      id: agent.id, // Prevent ID change
      createdAt: agent.createdAt, // Prevent creation time change
      updatedAt: Date.now(),
    };

    this.agents.set(id, updated);
    saveStore(this.agents);
    return this.sanitizeAgent(updated);
  }

  deleteAgent(id: string): boolean {
    const deleted = this.agents.delete(id);
    saveStore(this.agents);
    this.logs.delete(id);
    return deleted;
  }

  // ========== Status Management ==========

  setStatus(id: string, status: HostedAgentData['status'], errorMessage?: string): HostedAgentData | null {
    const agent = this.agents.get(id);
    if (!agent) return null;

    const updates: Partial<HostedAgentData> = { status };
    
    if (status === 'running' && agent.status !== 'running') {
      updates.startedAt = Date.now();
      this.addLog(id, 'info', 'Agent runtime started');
    } else if (status === 'paused') {
      this.addLog(id, 'info', 'Agent runtime paused');
    } else if (status === 'stopped') {
      this.addLog(id, 'info', 'Agent runtime stopped');
    } else if (status === 'error') {
      updates.errorMessage = errorMessage || 'Unknown error';
      this.addLog(id, 'error', `Agent error: ${updates.errorMessage}`);
    }

    return this.updateAgent(id, updates);
  }

  // ========== Stats ==========

  incrementStats(id: string, field: 'totalOrders' | 'completedOrders' | 'failedOrders'): void {
    const agent = this.agents.get(id);
    if (!agent) return;

    agent.stats[field]++;
    agent.stats.lastActiveAt = Date.now();
    agent.updatedAt = Date.now();
    saveStore(this.agents);
  }

  addEarnings(id: string, amount: bigint): void {
    const agent = this.agents.get(id);
    if (!agent) return;

    const current = BigInt(agent.stats.totalEarnings || '0');
    agent.stats.totalEarnings = (current + amount).toString();
    agent.updatedAt = Date.now();
    saveStore(this.agents);
  }

  // ========== Logs ==========

  addLog(agentId: string, level: 'info' | 'warn' | 'error', message: string, orderId?: string, metadata?: Record<string, unknown>): void {
    const logs = this.logs.get(agentId);
    if (!logs) return;

    const log: HostedAgentLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      timestamp: Date.now(),
      level,
      message,
      orderId,
      metadata,
    };

    logs.unshift(log);
    
    // Keep last 1000 logs
    if (logs.length > 1000) {
      logs.pop();
    }
  }

  getLogs(agentId: string, limit = 50): HostedAgentLog[] {
    const logs = this.logs.get(agentId);
    if (!logs) return [];
    return logs.slice(0, limit);
  }

  // ========== Secrets ==========

  encryptSecrets(secrets: Record<string, string>): string {
    const text = JSON.stringify(secrets);
    const iv = randomBytes(16);
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decryptSecrets(encrypted: string): Record<string, string> {
    try {
      const [ivHex, encryptedText] = encrypted.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
      const decipher = createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch {
      return {};
    }
  }

  getDecryptedSecrets(agentId: string): Record<string, string> | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    return this.decryptSecrets(agent.encryptedSecrets);
  }

  // ========== Helpers ==========

  private sanitizeAgent(agent: HostedAgentData): HostedAgentData {
    // Remove encrypted secrets from API responses
    const { encryptedSecrets, ...safe } = agent;
    return { ...safe, encryptedSecrets: '[REDACTED]' };
  }

  // Get all running agents (for orchestrator)
  getRunningAgents(): HostedAgentData[] {
    return Array.from(this.agents.values()).filter(a => a.status === 'running');
  }
}

// Singleton instance
export const hostedAgentsStore = new HostedAgentsStore();
