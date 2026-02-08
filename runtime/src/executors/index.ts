/**
 * AI Model Executors
 * Export all executors and registry
 */

export * from './base';
export * from './openai';
export * from './anthropic';
export * from './google';
export * from './deepseek';
export * from './grok';
export * from './kimi';

import { executorRegistry } from './base';
import { OpenAIExecutor } from './openai';
import { AnthropicExecutor } from './anthropic';
import { GoogleExecutor } from './google';
import { DeepSeekExecutor } from './deepseek';
import { GrokExecutor } from './grok';
import { KimiExecutor } from './kimi';

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
