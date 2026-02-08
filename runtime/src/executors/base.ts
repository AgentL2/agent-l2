/**
 * Base Executor Interface
 * All AI model executors implement this interface
 */

export interface ExecutorInput {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
  images?: string[]; // Base64 or URLs
}

export interface ExecutorResult {
  success: boolean;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: {
    input: number;
    output: number;
    total: number;
  };
  metadata?: Record<string, any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface CostEstimate {
  estimatedTokens: number;
  estimatedCost: number;
  currency: string;
}

export abstract class BaseExecutor {
  abstract id: string;
  abstract name: string;
  abstract provider: string;
  abstract models: string[];
  abstract defaultModel: string;

  // Pricing per 1M tokens
  abstract pricing: {
    [model: string]: {
      input: number;
      output: number;
    };
  };

  abstract execute(input: ExecutorInput): Promise<ExecutorResult>;
  
  abstract stream(input: ExecutorInput): AsyncGenerator<string, void, unknown>;

  estimateCost(input: ExecutorInput): CostEstimate {
    const model = input.model || this.defaultModel;
    const pricing = this.pricing[model] || this.pricing[this.defaultModel];
    
    // Rough estimate: 4 chars per token
    const estimatedTokens = Math.ceil((input.prompt.length + (input.systemPrompt?.length || 0)) / 4);
    const estimatedOutputTokens = input.maxTokens || 1000;
    
    const inputCost = (estimatedTokens / 1_000_000) * pricing.input;
    const outputCost = (estimatedOutputTokens / 1_000_000) * pricing.output;
    
    return {
      estimatedTokens: estimatedTokens + estimatedOutputTokens,
      estimatedCost: inputCost + outputCost,
      currency: 'USD',
    };
  }

  protected calculateCost(model: string, promptTokens: number, completionTokens: number) {
    const pricing = this.pricing[model] || this.pricing[this.defaultModel];
    return {
      input: (promptTokens / 1_000_000) * pricing.input,
      output: (completionTokens / 1_000_000) * pricing.output,
      total: ((promptTokens / 1_000_000) * pricing.input) + ((completionTokens / 1_000_000) * pricing.output),
    };
  }
}

export class ExecutorRegistry {
  private executors: Map<string, BaseExecutor> = new Map();

  register(executor: BaseExecutor): void {
    this.executors.set(executor.id, executor);
    console.log(`Registered executor: ${executor.name} (${executor.provider})`);
  }

  get(id: string): BaseExecutor | undefined {
    return this.executors.get(id);
  }

  getByProvider(provider: string): BaseExecutor[] {
    return Array.from(this.executors.values()).filter(e => e.provider === provider);
  }

  list(): BaseExecutor[] {
    return Array.from(this.executors.values());
  }

  getForServiceType(serviceType: string): BaseExecutor | undefined {
    // Map service types to appropriate executors
    const mapping: Record<string, string[]> = {
      'text-generation': ['openai', 'anthropic', 'google', 'deepseek'],
      'code-review': ['anthropic', 'openai', 'deepseek'],
      'sentiment-analysis': ['openai', 'google', 'anthropic'],
      'translation': ['google', 'openai', 'deepseek'],
      'image-analysis': ['openai', 'google', 'anthropic'],
      'reasoning': ['openai', 'anthropic', 'deepseek'],
    };

    const preferredProviders = mapping[serviceType] || ['openai'];
    
    for (const provider of preferredProviders) {
      const executors = this.getByProvider(provider);
      if (executors.length > 0) return executors[0];
    }
    
    // Fallback to first available
    return this.executors.values().next().value;
  }
}

export const executorRegistry = new ExecutorRegistry();
