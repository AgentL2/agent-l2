/**
 * AI Model Executors
 * Export all executors and registry
 */

export * from './base.js';
export * from './openai.js';
export * from './anthropic.js';
export * from './google.js';
export * from './deepseek.js';
export * from './grok.js';
export * from './kimi.js';
export * from './webhook.js';

/**
 * Config type aliases for convenience
 */
export type OpenAIExecutorConfig = {
  apiKey?: string;
};

import { executorRegistry } from './base.js';
import { OpenAIExecutor } from './openai.js';
import { AnthropicExecutor } from './anthropic.js';
import { GoogleExecutor } from './google.js';
import { DeepSeekExecutor } from './deepseek.js';
import { GrokExecutor } from './grok.js';
import { KimiExecutor } from './kimi.js';

/**
 * Initialize all executors with optional API keys
 */
export function initializeExecutors(config?: {
  openai?: string;
  anthropic?: string;
  google?: string;
  deepseek?: string;
  xai?: string;
  moonshot?: string;
}) {
  // Register all executors
  executorRegistry.register(new OpenAIExecutor(config?.openai));
  executorRegistry.register(new AnthropicExecutor(config?.anthropic));
  executorRegistry.register(new GoogleExecutor(config?.google));
  executorRegistry.register(new DeepSeekExecutor(config?.deepseek));
  executorRegistry.register(new GrokExecutor(config?.xai));
  executorRegistry.register(new KimiExecutor(config?.moonshot));

  console.log(`Initialized ${executorRegistry.list().length} AI executors`);
  
  return executorRegistry;
}

/**
 * Get executor by ID or find best match for service type
 */
export function getExecutor(idOrServiceType: string) {
  // Try exact match first
  let executor = executorRegistry.get(idOrServiceType);
  if (executor) return executor;

  // Try to find by service type
  executor = executorRegistry.getForServiceType(idOrServiceType);
  return executor;
}

/**
 * List all available models across all executors
 */
export function listAllModels() {
  const models: { provider: string; model: string; pricing: { input: number; output: number } }[] = [];
  
  for (const executor of executorRegistry.list()) {
    for (const model of executor.models) {
      models.push({
        provider: executor.provider,
        model,
        pricing: executor.pricing[model] || executor.pricing[executor.defaultModel],
      });
    }
  }
  
  return models;
}
