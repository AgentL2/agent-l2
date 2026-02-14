/**
 * xAI Grok Executor
 * Supports Grok 2, Grok 3 models
 */

import { BaseExecutor, ExecutorInput, ExecutorResult, ToolDefinition } from './base.js';

export class GrokExecutor extends BaseExecutor {
  id = 'grok';
  name = 'xAI Grok';
  provider = 'xai';
  models = ['grok-2', 'grok-2-mini', 'grok-3', 'grok-3-mini'];
  defaultModel = 'grok-2';

  // Pricing per 1M tokens (USD)
  pricing = {
    'grok-2': { input: 2.00, output: 10.00 },
    'grok-2-mini': { input: 0.20, output: 1.00 },
    'grok-3': { input: 3.00, output: 15.00 },
    'grok-3-mini': { input: 0.30, output: 1.50 },
  };

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.XAI_API_KEY || '';
    this.baseUrl = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';
  }

  async execute(input: ExecutorInput): Promise<ExecutorResult> {
    const model = input.model || this.defaultModel;
    
    const messages: any[] = [];
    if (input.systemPrompt) {
      messages.push({ role: 'system', content: input.systemPrompt });
    }
    
    // Handle multimodal input (Grok supports images)
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
      temperature: input.temperature ?? 0.7,
    };

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
      throw new Error(`xAI API error: ${response.status} ${error}`);
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
      throw new Error(`xAI API error: ${response.status}`);
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
