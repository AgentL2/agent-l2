/**
 * Google Gemini Executor
 * Supports Gemini 2.0, Gemini Pro models
 */

import { BaseExecutor, ExecutorInput, ExecutorResult } from './base';

export class GoogleExecutor extends BaseExecutor {
  id = 'google';
  name = 'Google Gemini';
  provider = 'google';
  models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-thinking',
    'gemini-1.5-pro',
    'gemini-1.5-flash',
  ];
  defaultModel = 'gemini-2.0-flash';

  // Pricing per 1M tokens (USD)
  pricing = {
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'gemini-2.0-flash-thinking': { input: 0.10, output: 0.40 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  };

  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.GOOGLE_API_KEY || '';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
  }

  async execute(input: ExecutorInput): Promise<ExecutorResult> {
    const model = input.model || this.defaultModel;
    
    const contents: any[] = [];
    
    // Handle multimodal input
    const parts: any[] = [];
    
    if (input.images && input.images.length > 0) {
      for (const image of input.images) {
        if (image.startsWith('http')) {
          // For URLs, we need to fetch and convert to base64
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: image, // Would need to fetch in production
            }
          });
        } else {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: image,
            }
          });
        }
      }
    }
    
    parts.push({ text: input.prompt });
    contents.push({ role: 'user', parts });

    const body: any = {
      contents,
      generationConfig: {
        maxOutputTokens: input.maxTokens || 4096,
        temperature: input.temperature ?? 0.7,
      },
    };

    if (input.systemPrompt) {
      body.systemInstruction = { parts: [{ text: input.systemPrompt }] };
    }

    if (input.tools && input.tools.length > 0) {
      body.tools = [{
        functionDeclarations: input.tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        }))
      }];
    }

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    const textContent = data.candidates?.[0]?.content?.parts
      ?.filter((p: any) => p.text)
      ?.map((p: any) => p.text)
      ?.join('') || '';

    const usage = data.usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0 };
    
    return {
      success: true,
      content: textContent,
      model,
      usage: {
        promptTokens: usage.promptTokenCount || 0,
        completionTokens: usage.candidatesTokenCount || 0,
        totalTokens: (usage.promptTokenCount || 0) + (usage.candidatesTokenCount || 0),
      },
      cost: this.calculateCost(model, usage.promptTokenCount || 0, usage.candidatesTokenCount || 0),
      metadata: {
        finishReason: data.candidates?.[0]?.finishReason,
        safetyRatings: data.candidates?.[0]?.safetyRatings,
      },
    };
  }

  async *stream(input: ExecutorInput): AsyncGenerator<string, void, unknown> {
    const model = input.model || this.defaultModel;
    
    const contents = [{ role: 'user', parts: [{ text: input.prompt }] }];

    const body: any = {
      contents,
      generationConfig: {
        maxOutputTokens: input.maxTokens || 4096,
        temperature: input.temperature ?? 0.7,
      },
    };

    if (input.systemPrompt) {
      body.systemInstruction = { parts: [{ text: input.systemPrompt }] };
    }

    const url = `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
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
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) yield text;
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}
