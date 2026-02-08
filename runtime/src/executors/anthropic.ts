/**
 * Anthropic Executor
 * Supports Claude 3.5 Sonnet, Claude 4 Opus/Sonnet models
 */

import { BaseExecutor, ExecutorInput, ExecutorResult } from './base';

export class AnthropicExecutor extends BaseExecutor {
  id = 'anthropic';
  name = 'Anthropic Claude';
  provider = 'anthropic';
  models = [
    'claude-sonnet-4-20250514',
    'claude-opus-4-20250514', 
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
  ];
  defaultModel = 'claude-sonnet-4-20250514';

  // Pricing per 1M tokens (USD)
  pricing = {
    'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
    'claude-opus-4-20250514': { input: 15.00, output: 75.00 },
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  };

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com';
  }

  async execute(input: ExecutorInput): Promise<ExecutorResult> {
    const model = input.model || this.defaultModel;
    
    const messages: any[] = [];
    
    // Handle multimodal input
    if (input.images && input.images.length > 0) {
      const content: any[] = [];
      for (const image of input.images) {
        const isUrl = image.startsWith('http');
        content.push({
          type: 'image',
          source: isUrl 
            ? { type: 'url', url: image }
            : { type: 'base64', media_type: 'image/jpeg', data: image }
        });
      }
      content.push({ type: 'text', text: input.prompt });
      messages.push({ role: 'user', content });
    } else {
      messages.push({ role: 'user', content: input.prompt });
    }

    const body: any = {
      model,
      messages,
      max_tokens: input.maxTokens || 4096,
      temperature: input.temperature ?? 0.7,
    };

    if (input.systemPrompt) {
      body.system = input.systemPrompt;
    }

    if (input.tools && input.tools.length > 0) {
      body.tools = input.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    // Extract text content
    const textContent = data.content
      ?.filter((c: any) => c.type === 'text')
      ?.map((c: any) => c.text)
      ?.join('') || '';

    const usage = data.usage || { input_tokens: 0, output_tokens: 0 };
    
    return {
      success: true,
      content: textContent,
      model,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      },
      cost: this.calculateCost(model, usage.input_tokens, usage.output_tokens),
      metadata: {
        stopReason: data.stop_reason,
        toolUse: data.content?.filter((c: any) => c.type === 'tool_use'),
      },
    };
  }

  async *stream(input: ExecutorInput): AsyncGenerator<string, void, unknown> {
    const model = input.model || this.defaultModel;
    
    const messages = [{ role: 'user', content: input.prompt }];

    const body: any = {
      model,
      messages,
      max_tokens: input.maxTokens || 4096,
      temperature: input.temperature ?? 0.7,
      stream: true,
    };

    if (input.systemPrompt) {
      body.system = input.systemPrompt;
    }

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
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
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield parsed.delta.text;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}
