/**
 * Moonshot Kimi Executor
 * Supports Kimi (Moonshot) models - great for long context
 */

import { BaseExecutor, ExecutorInput, ExecutorResult } from './base';

export class KimiExecutor extends BaseExecutor {
  id = 'kimi';
  name = 'Moonshot Kimi';
  provider = 'moonshot';
  models = ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'];
  defaultModel = 'moonshot-v1-32k';

  // Pricing per 1M tokens (USD) - Competitive pricing
  pricing = {
    'moonshot-v1-8k': { input: 0.90, output: 0.90 },
    'moonshot-v1-32k': { input: 1.50, output: 1.50 },
    'moonshot-v1-128k': { input: 4.20, output: 4.20 },
  };

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.MOONSHOT_API_KEY || '';
    this.baseUrl = process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.cn/v1';
  }

  async execute(input: ExecutorInput): Promise<ExecutorResult> {
    const model = input.model || this.defaultModel;
    
    const messages: any[] = [];
    if (input.systemPrompt) {
      messages.push({ role: 'system', content: input.systemPrompt });
    }
    messages.push({ role: 'user', content: input.prompt });

    const body: any = {
      model,
      messages,
      max_tokens: input.maxTokens || 4096,
      temperature: input.temperature ?? 0.7,
    };

    if (input.tools && input.tools.length > 0) {
      body.tools = input.tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        }
      }));
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Moonshot API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    return {
      success: true,
      content: data.choices[0]?.message?.content || '',
      model,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      cost: this.calculateCost(model, usage.prompt_tokens, usage.completion_tokens),
      metadata: {
        finishReason: data.choices[0]?.finish_reason,
        toolCalls: data.choices[0]?.message?.tool_calls,
      },
    };
  }

  async *stream(input: ExecutorInput): AsyncGenerator<string, void, unknown> {
    const model = input.model || this.defaultModel;
    
    const messages: any[] = [];
    if (input.systemPrompt) {
      messages.push({ role: 'system', content: input.systemPrompt });
    }
    messages.push({ role: 'user', content: input.prompt });

    const body: any = {
      model,
      messages,
      max_tokens: input.maxTokens || 4096,
      temperature: input.temperature ?? 0.7,
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Moonshot API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error('No response body');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

      for (const line of lines) {
        const data = line.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}
