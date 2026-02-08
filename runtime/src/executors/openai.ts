/**
 * OpenAI Executor
 * Executes LLM-based tasks using OpenAI API
 */

import OpenAI from 'openai';
import type { TaskInput, TaskResult, ExecutionEstimate } from '../types.js';
import { BaseExecutor } from './base.js';

export interface OpenAIExecutorConfig {
  privateKey: string;
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class OpenAIExecutor extends BaseExecutor {
  id = 'openai-executor';
  name = 'OpenAI LLM Executor';
  version = '1.0.0';
  serviceTypes = [
    'sentiment-analysis',
    'text-generation',
    'summarization',
    'translation',
    'code-review',
    'code-generation',
    'question-answering',
    'classification',
    'extraction',
    'llm-*', // Wildcard for any LLM task
  ];

  private openai: OpenAI;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: OpenAIExecutorConfig) {
    super(config.privateKey);
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.model = config.model ?? 'gpt-4o-mini';
    this.maxTokens = config.maxTokens ?? 2048;
    this.temperature = config.temperature ?? 0.7;
  }

  async execute(task: TaskInput): Promise<TaskResult> {
    const startTime = Date.now();

    try {
      // Build prompt based on service type and payload
      const prompt = this.buildPrompt(task);
      
      // Make API call
      const apiRequest = {
        model: this.model,
        messages: [{ role: 'user' as const, content: prompt }],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      };

      const response = await this.openai.chat.completions.create(apiRequest);
      
      const output = {
        content: response.choices[0]?.message?.content ?? '',
        model: response.model,
        usage: response.usage,
        finishReason: response.choices[0]?.finish_reason,
      };

      // Generate proof of work
      const proof = await this.proofGenerator.generateLLMProof(
        task,
        apiRequest,
        response,
        output
      );

      // Generate result hash
      const resultHash = this.proofGenerator.generateResultHash(output);

      return {
        success: true,
        resultURI: '', // Will be set by runtime after storage
        resultHash,
        proof,
        metadata: this.createMetadata(startTime, {
          modelUsed: response.model,
          tokensUsed: response.usage?.total_tokens,
        }),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return this.createFailedResult(task, message, startTime);
    }
  }

  async estimate(task: TaskInput): Promise<ExecutionEstimate> {
    // Rough estimates based on typical response times
    const estimatedTokens = this.estimateTokens(task);
    const estimatedDurationMs = Math.max(1000, estimatedTokens * 10); // ~10ms per token

    return {
      estimatedDurationMs,
      estimatedCost: task.totalPrice,
      confidence: 0.8,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.openai.models.list();
      return response.data.length > 0;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Prompt Building
  // ============================================================================

  private buildPrompt(task: TaskInput): string {
    const { serviceType, payload } = task;
    const input = payload?.input ?? payload?.text ?? payload?.content ?? '';

    switch (serviceType.toLowerCase()) {
      case 'sentiment-analysis':
        return this.sentimentPrompt(String(input));
      
      case 'summarization':
        return this.summarizationPrompt(String(input), payload?.length as string);
      
      case 'translation':
        return this.translationPrompt(
          String(input),
          payload?.targetLanguage as string ?? 'English'
        );
      
      case 'code-review':
        return this.codeReviewPrompt(String(input), payload?.language as string);
      
      case 'code-generation':
        return this.codeGenerationPrompt(String(input), payload?.language as string);
      
      case 'classification':
        return this.classificationPrompt(
          String(input),
          payload?.categories as string[] ?? []
        );
      
      case 'extraction':
        return this.extractionPrompt(
          String(input),
          payload?.fields as string[] ?? []
        );
      
      case 'question-answering':
        return this.qaPrompt(
          payload?.question as string ?? String(input),
          payload?.context as string
        );
      
      default:
        // Generic prompt for unknown service types
        return this.genericPrompt(serviceType, input, payload);
    }
  }

  private sentimentPrompt(text: string): string {
    return `Analyze the sentiment of the following text. Return a JSON object with:
- sentiment: "positive", "negative", or "neutral"
- confidence: number between 0 and 1
- explanation: brief explanation of the sentiment

Text: """
${text}
"""

Respond ONLY with valid JSON.`;
  }

  private summarizationPrompt(text: string, length?: string): string {
    const lengthInstruction = length ? ` in ${length}` : '';
    return `Summarize the following text${lengthInstruction}:

"""
${text}
"""

Provide a clear, concise summary.`;
  }

  private translationPrompt(text: string, targetLanguage: string): string {
    return `Translate the following text to ${targetLanguage}:

"""
${text}
"""

Provide only the translation, no explanations.`;
  }

  private codeReviewPrompt(code: string, language?: string): string {
    const langNote = language ? ` (${language})` : '';
    return `Review the following code${langNote} and provide feedback. Return a JSON object with:
- issues: array of { severity: "critical"|"warning"|"suggestion", line?: number, description: string }
- overallScore: number 1-10
- summary: brief overall assessment

Code:
\`\`\`
${code}
\`\`\`

Respond ONLY with valid JSON.`;
  }

  private codeGenerationPrompt(description: string, language?: string): string {
    const langNote = language ? ` in ${language}` : '';
    return `Generate code${langNote} for the following task:

${description}

Provide clean, well-commented code. Include any necessary imports.`;
  }

  private classificationPrompt(text: string, categories: string[]): string {
    const catList = categories.length > 0 
      ? `Categories: ${categories.join(', ')}`
      : 'Determine appropriate categories';
    
    return `Classify the following text. ${catList}

Return a JSON object with:
- category: the primary category
- confidence: number between 0 and 1
- secondaryCategories: array of other applicable categories (optional)

Text: """
${text}
"""

Respond ONLY with valid JSON.`;
  }

  private extractionPrompt(text: string, fields: string[]): string {
    const fieldList = fields.length > 0
      ? `Extract these fields: ${fields.join(', ')}`
      : 'Extract all relevant entities and information';
    
    return `${fieldList}

From the following text:
"""
${text}
"""

Return a JSON object with the extracted information.
Respond ONLY with valid JSON.`;
  }

  private qaPrompt(question: string, context?: string): string {
    const contextSection = context 
      ? `Context:\n"""\n${context}\n"""\n\n`
      : '';
    
    return `${contextSection}Question: ${question}

Provide a clear, accurate answer.`;
  }

  private genericPrompt(serviceType: string, input: unknown, payload?: Record<string, unknown>): string {
    const instructions = payload?.instructions ?? payload?.prompt ?? '';
    return `Service: ${serviceType}
${instructions ? `Instructions: ${instructions}\n` : ''}
Input: ${JSON.stringify(input)}

Process the input according to the service type and provide the result.`;
  }

  private estimateTokens(task: TaskInput): number {
    const input = JSON.stringify(task.payload ?? {});
    // Rough estimate: 4 chars per token
    return Math.ceil(input.length / 4) + this.maxTokens;
  }
}
