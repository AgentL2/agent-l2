/**
 * Webhook Executor
 * Delegates task execution to external services via webhooks
 */

import type { TaskInput, TaskResult, ExecutionEstimate, ExecutionMetadata, Executor } from '../types.js';
import { createHash } from 'crypto';

export interface WebhookExecutorConfig {
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

export class WebhookExecutor implements Executor {
  id: string;
  name: string;
  version = '1.0.0';
  serviceTypes: string[];

  private webhookUrl: string;
  private apiKey?: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: WebhookExecutorConfig) {
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

      // Generate result hash
      const resultHash = this.generateResultHash(result.output);

      return {
        success: true,
        resultURI: '', // Will be set by runtime after storage
        resultHash,
        proof: {
          type: 'llm-completion',
          timestamp: Date.now(),
          inputHash: this.hashData(task.payload),
          outputHash: this.hashData(result.output),
          evidence: {
            apiCallHash: this.hashData({ url: this.webhookUrl, response: result.output }),
          },
          signature: '',
        },
        metadata: this.createMetadata(startTime, {
          modelUsed: result.metadata?.modelUsed,
          tokensUsed: result.metadata?.tokensUsed,
        }),
      };
    } catch (error: unknown) {
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

  private createFailedResult(task: TaskInput, error: string, startTime: number): TaskResult {
    return {
      success: false,
      resultURI: '',
      resultHash: new Uint8Array(32),
      proof: {
        type: 'llm-completion',
        timestamp: Date.now(),
        inputHash: this.hashData(task.payload),
        outputHash: '',
        evidence: {},
        signature: '',
      },
      error,
      metadata: this.createMetadata(startTime),
    };
  }

  private createMetadata(
    startTime: number,
    extra?: { modelUsed?: string; tokensUsed?: number }
  ): ExecutionMetadata {
    const endTime = Date.now();
    return {
      startTime,
      endTime,
      durationMs: endTime - startTime,
      executorId: this.id,
      executorVersion: this.version,
      modelUsed: extra?.modelUsed,
      tokensUsed: extra?.tokensUsed,
    };
  }

  private generateResultHash(data: unknown): Uint8Array {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(data));
    return new Uint8Array(hash.digest());
  }

  private hashData(data: unknown): string {
    const hash = createHash('sha256');
    hash.update(JSON.stringify(data ?? ''));
    return hash.digest('hex');
  }
}
