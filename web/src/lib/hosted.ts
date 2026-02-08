/**
 * Hosted Runtime Types & API Client
 * For users who want AgentL2 to run their agents
 */

// ============================================================================
// Types
// ============================================================================

export interface HostedAgent {
  id: string;
  address: string;
  name: string;
  status: HostedAgentStatus;
  template: ExecutorTemplate;
  config: HostedAgentConfig;
  stats: HostedAgentStats;
  createdAt: number;
  updatedAt: number;
}

export type HostedAgentStatus = 
  | 'pending'      // Waiting to start
  | 'starting'     // Spinning up
  | 'running'      // Active and processing orders
  | 'paused'       // Manually paused
  | 'error'        // Runtime error
  | 'stopped';     // Terminated

export interface HostedAgentConfig {
  /** Polling interval in ms */
  pollInterval: number;
  /** Max concurrent orders */
  maxConcurrent: number;
  /** Auto-complete orders */
  autoComplete: boolean;
  /** Template-specific settings */
  templateConfig: Record<string, unknown>;
  /** Encrypted secrets reference (not the actual values) */
  secretsConfigured: string[];
}

export interface HostedAgentStats {
  totalOrders: number;
  completedOrders: number;
  failedOrders: number;
  totalEarnings: string; // bigint as string
  totalCost: string;     // Platform costs (API usage, etc.)
  uptime: number;        // Seconds running
  lastActiveAt: number | null;
}

export interface ExecutorTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: TemplateCategory;
  serviceType: string;
  requiredSecrets: SecretField[];
  configFields: ConfigField[];
  estimatedCostPer1k: string; // Estimated cost per 1000 executions
  popular?: boolean;
}

export type TemplateCategory = 
  | 'ai-text'       // Text generation, analysis
  | 'ai-code'       // Code-related tasks
  | 'ai-image'      // Image processing
  | 'data'          // Data processing
  | 'web'           // Web scraping, APIs
  | 'custom';       // Custom webhook

export interface SecretField {
  key: string;
  label: string;
  description: string;
  required: boolean;
  placeholder?: string;
}

export interface ConfigField {
  key: string;
  label: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  default?: unknown;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
}

export interface DeployAgentRequest {
  address: string;
  name: string;
  templateId: string;
  config: Record<string, unknown>;
  secrets: Record<string, string>;
}

export interface HostedAgentLog {
  id: string;
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Executor Templates (Built-in)
// ============================================================================

export const EXECUTOR_TEMPLATES: ExecutorTemplate[] = [
  {
    id: 'sentiment-analysis',
    name: 'Sentiment Analysis',
    description: 'Analyze text sentiment (positive, negative, neutral) with confidence scores. Perfect for social media monitoring, review analysis, and market sentiment.',
    icon: '😊',
    category: 'ai-text',
    serviceType: 'sentiment-analysis',
    requiredSecrets: [
      {
        key: 'OPENAI_API_KEY',
        label: 'OpenAI API Key',
        description: 'Your OpenAI API key for GPT models',
        required: true,
        placeholder: 'sk-...',
      },
    ],
    configFields: [
      {
        key: 'model',
        label: 'Model',
        description: 'Which GPT model to use',
        type: 'select',
        required: true,
        default: 'gpt-4o-mini',
        options: [
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cheap)' },
          { value: 'gpt-4o', label: 'GPT-4o (Best Quality)' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        ],
      },
      {
        key: 'includeExplanation',
        label: 'Include Explanation',
        description: 'Include reasoning for the sentiment score',
        type: 'boolean',
        required: false,
        default: true,
      },
    ],
    estimatedCostPer1k: '$0.50',
    popular: true,
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Automated code review with suggestions for improvements, bug detection, and best practices. Supports multiple languages.',
    icon: '👨‍💻',
    category: 'ai-code',
    serviceType: 'code-review',
    requiredSecrets: [
      {
        key: 'OPENAI_API_KEY',
        label: 'OpenAI API Key',
        description: 'Your OpenAI API key for GPT models',
        required: true,
        placeholder: 'sk-...',
      },
    ],
    configFields: [
      {
        key: 'model',
        label: 'Model',
        description: 'Which GPT model to use',
        type: 'select',
        required: true,
        default: 'gpt-4o',
        options: [
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
          { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        ],
      },
      {
        key: 'focusAreas',
        label: 'Focus Areas',
        description: 'What to focus on in reviews',
        type: 'select',
        required: false,
        default: 'all',
        options: [
          { value: 'all', label: 'All (Bugs, Style, Performance)' },
          { value: 'bugs', label: 'Bug Detection Only' },
          { value: 'security', label: 'Security Issues' },
          { value: 'performance', label: 'Performance Optimization' },
        ],
      },
    ],
    estimatedCostPer1k: '$2.00',
    popular: true,
  },
  {
    id: 'text-summarization',
    name: 'Text Summarization',
    description: 'Summarize long documents, articles, or conversations into concise summaries. Configurable length and style.',
    icon: '📝',
    category: 'ai-text',
    serviceType: 'text-summarization',
    requiredSecrets: [
      {
        key: 'OPENAI_API_KEY',
        label: 'OpenAI API Key',
        description: 'Your OpenAI API key',
        required: true,
        placeholder: 'sk-...',
      },
    ],
    configFields: [
      {
        key: 'model',
        label: 'Model',
        description: 'Which GPT model to use',
        type: 'select',
        required: true,
        default: 'gpt-4o-mini',
        options: [
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'gpt-4o', label: 'GPT-4o' },
        ],
      },
      {
        key: 'maxLength',
        label: 'Max Summary Length',
        description: 'Maximum words in summary',
        type: 'number',
        required: false,
        default: 200,
        min: 50,
        max: 1000,
      },
      {
        key: 'style',
        label: 'Summary Style',
        description: 'How to format the summary',
        type: 'select',
        required: false,
        default: 'paragraph',
        options: [
          { value: 'paragraph', label: 'Paragraph' },
          { value: 'bullets', label: 'Bullet Points' },
          { value: 'tldr', label: 'TL;DR (One Sentence)' },
        ],
      },
    ],
    estimatedCostPer1k: '$0.30',
  },
  {
    id: 'content-generation',
    name: 'Content Generation',
    description: 'Generate marketing copy, blog posts, social media content, and more. Customizable tone and format.',
    icon: '✍️',
    category: 'ai-text',
    serviceType: 'content-generation',
    requiredSecrets: [
      {
        key: 'OPENAI_API_KEY',
        label: 'OpenAI API Key',
        description: 'Your OpenAI API key',
        required: true,
        placeholder: 'sk-...',
      },
    ],
    configFields: [
      {
        key: 'model',
        label: 'Model',
        description: 'Which GPT model to use',
        type: 'select',
        required: true,
        default: 'gpt-4o',
        options: [
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
        ],
      },
      {
        key: 'tone',
        label: 'Tone',
        description: 'Writing tone/style',
        type: 'select',
        required: false,
        default: 'professional',
        options: [
          { value: 'professional', label: 'Professional' },
          { value: 'casual', label: 'Casual' },
          { value: 'friendly', label: 'Friendly' },
          { value: 'formal', label: 'Formal' },
          { value: 'humorous', label: 'Humorous' },
        ],
      },
    ],
    estimatedCostPer1k: '$1.50',
  },
  {
    id: 'data-extraction',
    name: 'Data Extraction',
    description: 'Extract structured data from unstructured text. Perfect for parsing emails, documents, or web content.',
    icon: '🔍',
    category: 'data',
    serviceType: 'data-extraction',
    requiredSecrets: [
      {
        key: 'OPENAI_API_KEY',
        label: 'OpenAI API Key',
        description: 'Your OpenAI API key',
        required: true,
        placeholder: 'sk-...',
      },
    ],
    configFields: [
      {
        key: 'model',
        label: 'Model',
        description: 'Which GPT model to use',
        type: 'select',
        required: true,
        default: 'gpt-4o-mini',
        options: [
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'gpt-4o', label: 'GPT-4o' },
        ],
      },
      {
        key: 'outputFormat',
        label: 'Output Format',
        description: 'How to format extracted data',
        type: 'select',
        required: false,
        default: 'json',
        options: [
          { value: 'json', label: 'JSON' },
          { value: 'csv', label: 'CSV' },
          { value: 'markdown', label: 'Markdown Table' },
        ],
      },
    ],
    estimatedCostPer1k: '$0.40',
  },
  {
    id: 'translation',
    name: 'Translation',
    description: 'High-quality translation between 50+ languages with context awareness.',
    icon: '🌐',
    category: 'ai-text',
    serviceType: 'translation',
    requiredSecrets: [
      {
        key: 'OPENAI_API_KEY',
        label: 'OpenAI API Key',
        description: 'Your OpenAI API key',
        required: true,
        placeholder: 'sk-...',
      },
    ],
    configFields: [
      {
        key: 'model',
        label: 'Model',
        description: 'Which GPT model to use',
        type: 'select',
        required: true,
        default: 'gpt-4o-mini',
        options: [
          { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
          { value: 'gpt-4o', label: 'GPT-4o' },
        ],
      },
      {
        key: 'targetLanguage',
        label: 'Default Target Language',
        description: 'Language to translate to (can be overridden per request)',
        type: 'select',
        required: true,
        default: 'es',
        options: [
          { value: 'es', label: 'Spanish' },
          { value: 'fr', label: 'French' },
          { value: 'de', label: 'German' },
          { value: 'zh', label: 'Chinese' },
          { value: 'ja', label: 'Japanese' },
          { value: 'ko', label: 'Korean' },
          { value: 'pt', label: 'Portuguese' },
          { value: 'ar', label: 'Arabic' },
        ],
      },
    ],
    estimatedCostPer1k: '$0.35',
  },
  {
    id: 'custom-webhook',
    name: 'Custom Webhook',
    description: 'Connect your own API endpoint. AgentL2 handles orders and payments, you handle the execution.',
    icon: '🔗',
    category: 'custom',
    serviceType: 'custom',
    requiredSecrets: [
      {
        key: 'WEBHOOK_SECRET',
        label: 'Webhook Secret',
        description: 'Secret for authenticating webhook calls (optional)',
        required: false,
        placeholder: 'your-secret-key',
      },
    ],
    configFields: [
      {
        key: 'webhookUrl',
        label: 'Webhook URL',
        description: 'Your API endpoint that will receive order requests',
        type: 'string',
        required: true,
      },
      {
        key: 'timeoutMs',
        label: 'Timeout (ms)',
        description: 'How long to wait for your webhook to respond',
        type: 'number',
        required: false,
        default: 30000,
        min: 5000,
        max: 300000,
      },
      {
        key: 'retries',
        label: 'Retries',
        description: 'Number of retry attempts on failure',
        type: 'number',
        required: false,
        default: 2,
        min: 0,
        max: 5,
      },
    ],
    estimatedCostPer1k: '$0.00 (your costs)',
  },
];

// ============================================================================
// API Client
// ============================================================================

export async function getHostedAgents(address: string): Promise<HostedAgent[]> {
  const response = await fetch(`/api/hosted/agents?address=${encodeURIComponent(address)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch hosted agents');
  }
  const data = await response.json();
  return data.agents;
}

export async function getHostedAgent(agentId: string): Promise<HostedAgent> {
  const response = await fetch(`/api/hosted/agents/${encodeURIComponent(agentId)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch hosted agent');
  }
  return response.json();
}

export async function deployHostedAgent(request: DeployAgentRequest): Promise<HostedAgent> {
  const response = await fetch('/api/hosted/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to deploy agent');
  }
  return response.json();
}

export async function pauseHostedAgent(agentId: string): Promise<void> {
  const response = await fetch(`/api/hosted/agents/${encodeURIComponent(agentId)}/pause`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to pause agent');
  }
}

export async function resumeHostedAgent(agentId: string): Promise<void> {
  const response = await fetch(`/api/hosted/agents/${encodeURIComponent(agentId)}/resume`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to resume agent');
  }
}

export async function stopHostedAgent(agentId: string): Promise<void> {
  const response = await fetch(`/api/hosted/agents/${encodeURIComponent(agentId)}/stop`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to stop agent');
  }
}

export async function getHostedAgentLogs(agentId: string, limit = 50): Promise<HostedAgentLog[]> {
  const response = await fetch(
    `/api/hosted/agents/${encodeURIComponent(agentId)}/logs?limit=${limit}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch logs');
  }
  const data = await response.json();
  return data.logs;
}

export async function updateHostedAgentConfig(
  agentId: string,
  config: Partial<HostedAgentConfig>
): Promise<HostedAgent> {
  const response = await fetch(`/api/hosted/agents/${encodeURIComponent(agentId)}/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error('Failed to update config');
  }
  return response.json();
}

export function getTemplateById(templateId: string): ExecutorTemplate | undefined {
  return EXECUTOR_TEMPLATES.find((t) => t.id === templateId);
}

export function getTemplatesByCategory(category: TemplateCategory): ExecutorTemplate[] {
  return EXECUTOR_TEMPLATES.filter((t) => t.category === category);
}
