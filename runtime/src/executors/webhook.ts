/**
 * Webhook Executor
 * Delegates task execution to external services via webhooks
 */

import type { TaskInput, TaskResult, ExecutionEstimate } from '../types.js';
import { BaseExecutor } from './base.js';

export interface WebhookExecutorConfig {
  privateKey: string;
  /** Base URL for the webhook endpoint */
  webhookUrl: string;
  /** API key for authentication (optional) */
  apiKey?: string;
  /** Service types this webhook handles */
  serviceTypes: string[];
  /** Timeout in ms (default: 60000) */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

export interface WebhookResponse {
  success: boolean;
  output: unknown;
  error?: string;
  metadata?: {
    durationMs?: number;
    modelUsed?: string;
    tokensUsed?: number;
  };
}

export class WebhookExecutor extends BaseExecutor {
  id: string;
  name: string;
  version = '1.0.0';
  serviceTypes: string[];

  private webhookUrl: string;
  private apiKey?: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: WebhookExecutorConfig) {
    super(config.privateKey);
    this.webhookUrl = config.webhookUrl;
    this.apiKey = config.apiKey;
    this.serviceTypes = config.serviceTypes;
    this.timeout = config.timeout ?? 60000;
    this.headers = config.headers ?? {};
    
    // Generate ID from URL
    const urlHash = Buffer.from(config.webhookUrl).toString('base64').slice(0, 8);
    this.id = `webhook-${urlHash}`;
    this.name = `Webhook Executor (${new URL(config.webhookUrl).hostname})`;
  }

  async execute(task: TaskInput): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...this.headers,
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId: task.orderId,
          serviceId: task.serviceId,
          serviceType: task.serviceType,
          buyer: task.buyer,
          units: task.units.toString(),
          totalPrice: task.totalPrice.toString(),
          deadline: task.deadline,
          payload: task.payload,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as WebhookResponse;

      if (!result.success) {
        return this.createFailedResult(task, result.error ?? 'Webhook execution failed', startTime);
      }

      // Generate proof of work
      const proof = await this.proofGenerator.generateSimpleProof(
        task,
        task.payload,
        result.output
      );

      // Generate result hash
      const resultHash = this.proofGenerator.generateResultHash(result.output);

      return {
        success: true,
        resultURI: '', // Will be set by runtime after storage
        resultHash,
        proof,
        metadata: this.createMetadata(startTime, {
          modelUsed: result.metadata?.modelUsed,
          tokensUsed: result.metadata?.tokensUsed,
        }),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.createFailedResult(task, message, startTime);
    }
  }

  async estimate(task: TaskInput): Promise<ExecutionEstimate> {
    return {
      estimatedDurationMs: this.timeout / 2, // Assume half timeout on average
      estimatedCost: task.totalPrice,
      confidence: 0.5,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const healthUrl = new URL('/health', this.webhookUrl).toString();
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {},
      });
      return response.ok;
    } catch {
      // If health endpoint doesn't exist, assume healthy
      return true;
    }
  }
}
