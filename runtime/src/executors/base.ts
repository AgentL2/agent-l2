/**
 * Base Executor
 * Abstract base class for task executors
 */

import type { Executor, TaskInput, TaskResult, ExecutionEstimate, ExecutionMetadata } from '../types.js';
import { ProofGenerator } from '../proof.js';

export abstract class BaseExecutor implements Executor {
  abstract id: string;
  abstract name: string;
  abstract version: string;
  abstract serviceTypes: string[];

  protected proofGenerator: ProofGenerator;

  constructor(privateKey: string) {
    this.proofGenerator = new ProofGenerator(privateKey);
  }

  /**
   * Execute the task - must be implemented by subclasses
   */
  abstract execute(task: TaskInput): Promise<TaskResult>;

  /**
   * Estimate execution cost/time (optional override)
   */
  async estimate(task: TaskInput): Promise<ExecutionEstimate> {
    return {
      estimatedDurationMs: 5000,
      estimatedCost: task.totalPrice,
      confidence: 0.5,
    };
  }

  /**
   * Health check - override for custom health logic
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Helper: Check if this executor handles a service type
   */
  handles(serviceType: string): boolean {
    return this.serviceTypes.some(
      (t) => t === '*' || t.toLowerCase() === serviceType.toLowerCase()
    );
  }

  /**
   * Helper: Create execution metadata
   */
  protected createMetadata(startTime: number, extras?: Partial<ExecutionMetadata>): ExecutionMetadata {
    const endTime = Date.now();
    return {
      startTime,
      endTime,
      durationMs: endTime - startTime,
      executorId: this.id,
      executorVersion: this.version,
      ...extras,
    };
  }

  /**
   * Helper: Create a failed result
   */
  protected createFailedResult(task: TaskInput, error: string, startTime: number): TaskResult {
    const metadata = this.createMetadata(startTime);
    return {
      success: false,
      resultURI: '',
      resultHash: new Uint8Array(32),
      proof: {
        type: 'llm-completion',
        timestamp: Date.now(),
        inputHash: '',
        outputHash: '',
        evidence: {},
        signature: '',
      },
      error,
      metadata,
    };
  }
}
