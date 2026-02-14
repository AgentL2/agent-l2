/**
 * OpenAI Executor
 * Supports GPT-4, GPT-4o, o1, o3 models
 */

import { BaseExecutor, ExecutorInput, ExecutorResult, ToolDefinition } from './base.js';

export class OpenAIExecutor extends BaseExecutor {
  id = 'openai';
  name = 'OpenAI';
  provider = 'openai';
  models = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1', 'o1-mini', 'o3-mini'];
  defaultModel = 'gpt-4o';

  // Pricing per 1M tokens (USD)
  pricing = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'o1': { input: 15.00, output: 60.00 },
    'o1-mini': { input: 3.00, output: 12.00 },
    'o3-mini': { input: 1.10, output: 4.40 },
  };

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  async execute(input: ExecutorInput): Promise<ExecutorResult> {
    const model = input.model || this.defaultModel;
    
    const messages: any[] = [];
    if (input.systemPrompt) {
      messages.push({ role: 'system', content: input.systemPrompt });
    }
    
    // Handle multimodal input
    if (input.images && input.images.length > 0) {
      const content: any[] = [{ type: 'text', text: input.prompt }];
      for (const image of input.images) {
        content.push({
          type: 'image_url',
          image_url: { url: image.startsWith('http') ? image : `data:image/jpeg;base64,${image}` }
        });
      }
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: input.prompt });
    }

    const body: any = {
      model,
      messages,
      max_tokens: input.maxTokens || 4096,
    };

    // o1/o3 models don't support temperature
    if (!model.startsWith('o1') && !model.startsWith('o3')) {
      body.temperature = input.temperature ?? 0.7;
    }

    if (input.tools && input.tools.length > 0) {
      body.tools = input.tools.map((t: ToolDefinition) => ({
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
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
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
      stream: true,
    };

    if (!model.startsWith('o1') && !model.startsWith('o3')) {
      body.temperature = input.temperature ?? 0.7;
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
      throw new Error(`OpenAI API error: ${response.status}`);
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
