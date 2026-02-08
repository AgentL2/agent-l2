/**
 * Executor Registry
 * Manages available executors and routes tasks to appropriate handlers
 */

export { BaseExecutor } from './base.js';
export { OpenAIExecutor, type OpenAIExecutorConfig } from './openai.js';
export { WebhookExecutor, type WebhookExecutorConfig, type WebhookResponse } from './webhook.js';

import type { Executor, TaskInput } from '../types.js';

export class ExecutorRegistry {
  private executors: Map<string, Executor> = new Map();

  /**
   * Register an executor
   */
  register(executor: Executor): void {
    this.executors.set(executor.id, executor);
    console.log(`[Registry] Registered executor: ${executor.name} (${executor.id})`);
    console.log(`  Service types: ${executor.serviceTypes.join(', ')}`);
  }

  /**
   * Unregister an executor
   */
  unregister(executorId: string): void {
    this.executors.delete(executorId);
  }

  /**
   * Find an executor that can handle a service type
   */
  findExecutor(serviceType: string): Executor | null {
    for (const executor of this.executors.values()) {
      if (this.executorHandles(executor, serviceType)) {
        return executor;
      }
    }
    return null;
  }

  /**
   * Get all executors that can handle a service type
   */
  findAllExecutors(serviceType: string): Executor[] {
    const result: Executor[] = [];
    for (const executor of this.executors.values()) {
      if (this.executorHandles(executor, serviceType)) {
        result.push(executor);
      }
    }
    return result;
  }

  /**
   * Get executor by ID
   */
  get(executorId: string): Executor | null {
    return this.executors.get(executorId) ?? null;
  }

  /**
   * List all registered executors
   */
  list(): Executor[] {
    return Array.from(this.executors.values());
  }

  /**
   * Check health of all executors
   */
  async healthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    for (const [id, executor] of this.executors) {
      try {
        results.set(id, await executor.healthCheck());
      } catch {
        results.set(id, false);
      }
    }
    return results;
  }

  /**
   * Check if an executor handles a service type
   */
  private executorHandles(executor: Executor, serviceType: string): boolean {
    return executor.serviceTypes.some((t) => {
      if (t === '*') return true;
      if (t.endsWith('*')) {
        const prefix = t.slice(0, -1);
        return serviceType.toLowerCase().startsWith(prefix.toLowerCase());
      }
      return t.toLowerCase() === serviceType.toLowerCase();
    });
  }
}
