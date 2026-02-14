/**
 * Agent Executor - Actually runs AI models
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { pino } from 'pino';
import type { Agent, OrderInput, OrderResult, AgentTool } from '../shared/types.js';

const logger = pino({ name: 'executor' });

/**
 * Retry wrapper for transient API failures (rate limits, timeouts, server errors)
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelayMs?: number; operation?: string } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 1000, operation = 'operation' } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRetryable =
        lastError.message.includes('429') ||
        lastError.message.includes('rate limit') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('500') ||
        lastError.message.includes('502') ||
        lastError.message.includes('503') ||
        lastError.message.includes('overloaded');

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      logger.warn(
        { attempt: attempt + 1, maxRetries, delay: Math.round(delay), operation },
        `Retrying ${operation} after transient failure: ${lastError.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`${operation} failed after ${maxRetries} retries`);
}

/**
 * Execute an agent with the given input
 */
export async function executeAgent(
  agent: Agent,
  input: OrderInput,
  secrets: Record<string, string>
): Promise<OrderResult> {
  logger.info({ agentId: agent.id, model: agent.model }, 'Executing agent');

  // Build messages
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: agent.systemPrompt },
  ];

  // Add conversation history if provided
  if (input.messages) {
    for (const msg of input.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add the current request
  messages.push({ role: 'user', content: input.prompt });

  // Apply guardrails - blocked topics check
  if (agent.guardrails.blockedTopics.length > 0) {
    const lowerPrompt = input.prompt.toLowerCase();
    for (const topic of agent.guardrails.blockedTopics) {
      if (lowerPrompt.includes(topic.toLowerCase())) {
        throw new Error(`Request contains blocked topic: ${topic}`);
      }
    }
  }

  // Execute based on model provider
  if (agent.model.startsWith('gpt-') || agent.model.startsWith('gpt4')) {
    return executeOpenAI(agent, messages, secrets, input.params);
  } else if (agent.model.startsWith('claude-')) {
    return executeAnthropic(agent, messages, secrets, input.params);
  } else {
    throw new Error(`Unsupported model: ${agent.model}`);
  }
}

/**
 * Execute with OpenAI
 */
async function executeOpenAI(
  agent: Agent,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  secrets: Record<string, string>,
  params?: Record<string, unknown>
): Promise<OrderResult> {
  const apiKey = secrets.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const client = new OpenAI({ apiKey });

  // Convert tools to OpenAI format
  const tools = agent.tools.length > 0 
    ? agent.tools.map(toolToOpenAI)
    : undefined;

  const response = await withRetry(
    () => client.chat.completions.create({
    model: agent.model,
    messages,
    temperature: agent.temperature,
    max_tokens: Math.min(agent.maxTokens, agent.guardrails.maxTokensPerRequest),
    tools,
    ...(params || {}),
  }),
    { operation: 'OpenAI API call' }
  );

  const choice = response.choices[0];
  const toolCalls: OrderResult['toolCalls'] = [];

  // Handle tool calls if any
  if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
    for (const toolCall of choice.message.tool_calls) {
      const tool = agent.tools.find((t) => t.name === toolCall.function.name);
      if (tool) {
        const toolInput = JSON.parse(toolCall.function.arguments);
        const toolOutput = await executeToolCall(tool, toolInput, secrets);
        toolCalls.push({
          tool: tool.name,
          input: toolInput,
          output: toolOutput,
        });
      }
    }
  }

  return {
    response: choice.message.content || '',
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    model: agent.model,
    tokensUsed: {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    },
  };
}

/**
 * Execute with Anthropic
 */
async function executeAnthropic(
  agent: Agent,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  secrets: Record<string, string>,
  params?: Record<string, unknown>
): Promise<OrderResult> {
  const apiKey = secrets.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  const client = new Anthropic({ apiKey });

  // Extract system message
  const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
  const chatMessages = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Convert tools to Anthropic format
  const tools = agent.tools.length > 0
    ? agent.tools.map(toolToAnthropic)
    : undefined;

  const response = await client.messages.create({
    model: agent.model,
    system: systemMessage,
    messages: chatMessages,
    max_tokens: Math.min(agent.maxTokens, agent.guardrails.maxTokensPerRequest),
    temperature: agent.temperature,
    tools,
  });

  // Extract text content
  let textContent = '';
  const toolCalls: OrderResult['toolCalls'] = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      textContent += block.text;
    } else if (block.type === 'tool_use') {
      const tool = agent.tools.find((t) => t.name === block.name);
      if (tool) {
        const toolOutput = await executeToolCall(tool, block.input as Record<string, unknown>, secrets);
        toolCalls.push({
          tool: tool.name,
          input: block.input as Record<string, unknown>,
          output: toolOutput,
        });
      }
    }
  }

  return {
    response: textContent,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    model: agent.model,
    tokensUsed: {
      prompt: response.usage.input_tokens,
      completion: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}

/**
 * Execute a tool call
 */
async function executeToolCall(
  tool: AgentTool,
  input: Record<string, unknown>,
  secrets: Record<string, string>
): Promise<unknown> {
  if (tool.handler === 'builtin') {
    return executeBuiltinTool(tool.name, input, secrets);
  } else if (tool.handler === 'webhook' && tool.webhookUrl) {
    return executeWebhookTool(tool, input, secrets);
  } else {
    throw new Error(`Unknown tool handler: ${tool.handler}`);
  }
}

/**
 * Execute built-in tools
 */
async function executeBuiltinTool(
  name: string,
  input: Record<string, unknown>,
  secrets: Record<string, string>
): Promise<unknown> {
  switch (name) {
    case 'calculator':
      return executeCalculator(input);
    case 'web_search':
      return executeWebSearch(input, secrets);
    default:
      throw new Error(`Unknown builtin tool: ${name}`);
  }
}

function executeCalculator(input: Record<string, unknown>): unknown {
  const expression = input.expression as string;
  try {
    const result = safeEvaluate(expression);
    return { result };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Invalid expression' };
  }
}

/**
 * Safe math expression evaluator using recursive descent parsing.
 * Supports: +, -, *, /, %, parentheses, and decimal numbers.
 * No eval(), no Function(), no code injection possible.
 */
function safeEvaluate(expr: string): number {
  let pos = 0;
  const str = expr.replace(/\s+/g, '');

  function parseExpression(): number {
    let result = parseTerm();
    while (pos < str.length && (str[pos] === '+' || str[pos] === '-')) {
      const op = str[pos++];
      const term = parseTerm();
      result = op === '+' ? result + term : result - term;
    }
    return result;
  }

  function parseTerm(): number {
    let result = parseFactor();
    while (pos < str.length && (str[pos] === '*' || str[pos] === '/' || str[pos] === '%')) {
      const op = str[pos++];
      const factor = parseFactor();
      if (op === '/' && factor === 0) throw new Error('Division by zero');
      result = op === '*' ? result * factor : op === '/' ? result / factor : result % factor;
    }
    return result;
  }

  function parseFactor(): number {
    // Handle unary minus
    if (str[pos] === '-') {
      pos++;
      return -parseFactor();
    }
    // Handle unary plus
    if (str[pos] === '+') {
      pos++;
      return parseFactor();
    }
    // Handle parentheses
    if (str[pos] === '(') {
      pos++; // skip '('
      const result = parseExpression();
      if (str[pos] !== ')') throw new Error('Mismatched parentheses');
      pos++; // skip ')'
      return result;
    }
    // Parse number
    const start = pos;
    while (pos < str.length && (str[pos] >= '0' && str[pos] <= '9' || str[pos] === '.')) {
      pos++;
    }
    if (start === pos) throw new Error(`Unexpected character: ${str[pos] || 'end of input'}`);
    return parseFloat(str.slice(start, pos));
  }

  const result = parseExpression();
  if (pos < str.length) throw new Error(`Unexpected character: ${str[pos]}`);
  return result;
}

async function executeWebSearch(
  input: Record<string, unknown>,
  secrets: Record<string, string>
): Promise<unknown> {
  const query = input.query as string;
  const braveKey = secrets.BRAVE_API_KEY || process.env.BRAVE_API_KEY;
  
  if (!braveKey) {
    return { error: 'Web search not configured' };
  }

  try {
    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          'X-Subscription-Token': braveKey,
          'Accept': 'application/json',
        },
      }
    );
    
    const data = await response.json();
    return {
      results: data.web?.results?.map((r: { title: string; url: string; description: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.description,
      })) || [],
    };
  } catch (err) {
    return { error: 'Web search failed' };
  }
}

/**
 * Execute webhook tool
 */
async function executeWebhookTool(
  tool: AgentTool,
  input: Record<string, unknown>,
  secrets: Record<string, string>
): Promise<unknown> {
  const webhookSecret = tool.webhookSecret ? secrets[tool.webhookSecret] : undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (webhookSecret) {
    headers['Authorization'] = `Bearer ${webhookSecret}`;
  }

  try {
    const response = await fetch(tool.webhookUrl!, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    logger.error({ err, tool: tool.name }, 'Webhook tool execution failed');
    throw err;
  }
}

/**
 * Convert tool to OpenAI format
 */
function toolToOpenAI(tool: AgentTool): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as OpenAI.FunctionParameters,
    },
  };
}

/**
 * Convert tool to Anthropic format
 */
function toolToAnthropic(tool: AgentTool): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters as Anthropic.Tool.InputSchema,
  };
}
