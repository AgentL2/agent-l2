'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Check, Loader2, Zap, Bot, Brain,
  Shield, Wrench, AlertTriangle, CheckCircle2, Sparkles, Code
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import DashboardNav from '@/components/dashboard/DashboardNav';

type Step = 'basics' | 'prompt' | 'model' | 'tools' | 'guardrails' | 'review' | 'success';

const MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Best overall quality, multimodal', cost: '$$$' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast and affordable', cost: '$' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'Anthropic', description: 'Highest capability', cost: '$$$' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'Anthropic', description: 'Balanced performance', cost: '$$' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Fast and efficient', cost: '$' },
];

const BUILTIN_TOOLS = [
  { id: 'web_search', name: 'Web Search', description: 'Search the web for current information', icon: '🔍' },
  { id: 'calculator', name: 'Calculator', description: 'Perform mathematical calculations', icon: '🧮' },
  { id: 'code_interpreter', name: 'Code Interpreter', description: 'Execute Python code safely', icon: '💻' },
];

interface AgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
  guardrails: {
    maxTokensPerRequest: number;
    maxRequestsPerMinute: number;
    blockedTopics: string[];
    requireHumanApproval: boolean;
  };
}

export default function CreateAgentPage() {
  const router = useRouter();
  const { address, connect, isConnecting } = useWallet();
  
  const [step, setStep] = useState<Step>('basics');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);
  
  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    description: '',
    systemPrompt: '',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 4096,
    tools: [],
    guardrails: {
      maxTokensPerRequest: 4096,
      maxRequestsPerMinute: 60,
      blockedTopics: [],
      requireHumanApproval: false,
    },
  });

  const [blockedTopicInput, setBlockedTopicInput] = useState('');

  const updateConfig = (updates: Partial<AgentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleCreate = async () => {
    if (!address) return;
    
    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/runtime/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          ownerAddress: address,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create agent');
      }

      const agent = await response.json();
      setCreatedAgentId(agent.id);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setCreating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'basics':
        return config.name.trim().length > 0;
      case 'prompt':
        return config.systemPrompt.trim().length > 0;
      case 'model':
        return true;
      case 'tools':
        return true;
      case 'guardrails':
        return true;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['basics', 'prompt', 'model', 'tools', 'guardrails', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['basics', 'prompt', 'model', 'tools', 'guardrails', 'review'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const stepNumber = ['basics', 'prompt', 'model', 'tools', 'guardrails', 'review', 'success'].indexOf(step) + 1;

  return (
    <div className="min-h-screen bg-surface text-ink">
      <DashboardNav
        activeTab="hosted"
        setActiveTab={() => {}}
        isConnected={!!address}
        address={address}
      />

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href="/dashboard?tab=hosted"
          className="inline-flex items-center gap-2 text-ink-muted hover:text-accent transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agents
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink mb-2">Create AI Agent</h1>
          <p className="text-ink-muted">
            Build a real AI agent with custom prompts, tools, and guardrails
          </p>
        </div>

        {/* Progress Steps */}
        {step !== 'success' && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {['Basics', 'Prompt', 'Model', 'Tools', 'Safety', 'Review'].map((label, idx) => (
              <div key={label} className="flex items-center">
                {idx > 0 && <div className="w-8 h-px bg-border mx-1" />}
                <StepIndicator num={idx + 1} current={stepNumber} label={label} />
              </div>
            ))}
          </div>
        )}

        {/* Connect Wallet Prompt */}
        {!address && (
          <div className="card border-accent/30 bg-accent/5 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink">Connect your wallet</h3>
                <p className="text-sm text-ink-muted">Required to create an agent</p>
              </div>
              <button onClick={() => connect()} disabled={isConnecting} className="btn-primary">
                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {step === 'basics' && (
            <BasicsStep config={config} updateConfig={updateConfig} />
          )}
          {step === 'prompt' && (
            <PromptStep config={config} updateConfig={updateConfig} />
          )}
          {step === 'model' && (
            <ModelStep config={config} updateConfig={updateConfig} />
          )}
          {step === 'tools' && (
            <ToolsStep config={config} updateConfig={updateConfig} />
          )}
          {step === 'guardrails' && (
            <GuardrailsStep 
              config={config} 
              updateConfig={updateConfig}
              blockedTopicInput={blockedTopicInput}
              setBlockedTopicInput={setBlockedTopicInput}
            />
          )}
          {step === 'review' && (
            <ReviewStep config={config} />
          )}
          {step === 'success' && createdAgentId && (
            <SuccessStep agentId={createdAgentId} agentName={config.name} />
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Footer Actions */}
        {step !== 'success' && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <div>
              {step !== 'basics' && (
                <button onClick={prevStep} className="btn-ghost" disabled={creating}>
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard?tab=hosted" className="btn-ghost">
                Cancel
              </Link>
              {step !== 'review' ? (
                <button
                  onClick={nextStep}
                  className="btn-primary"
                  disabled={!canProceed() || !address}
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  className="btn-primary"
                  disabled={creating || !address}
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Create Agent
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Step Components
// =============================================================================

function StepIndicator({ num, current, label }: { num: number; current: number; label: string }) {
  const isComplete = current > num;
  const isCurrent = current === num;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
          isComplete
            ? 'bg-accent text-white'
            : isCurrent
            ? 'bg-accent/20 text-accent border border-accent'
            : 'bg-surface-muted text-ink-muted border border-border'
        }`}
      >
        {isComplete ? <Check className="w-3 h-3" /> : num}
      </div>
      <span className={`text-sm ${isCurrent ? 'text-ink font-medium' : 'text-ink-muted'}`}>
        {label}
      </span>
    </div>
  );
}

function BasicsStep({ config, updateConfig }: { config: AgentConfig; updateConfig: (u: Partial<AgentConfig>) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Bot className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">Agent Identity</h3>
            <p className="text-sm text-ink-muted">Give your agent a name and description</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Agent Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => updateConfig({ name: e.target.value })}
              className="input-field"
              placeholder="e.g., Customer Support Agent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Description
            </label>
            <textarea
              value={config.description}
              onChange={(e) => updateConfig({ description: e.target.value })}
              className="input-field min-h-[100px] resize-y"
              placeholder="What does this agent do? Who is it for?"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PromptStep({ config, updateConfig }: { config: AgentConfig; updateConfig: (u: Partial<AgentConfig>) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Brain className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">System Prompt</h3>
            <p className="text-sm text-ink-muted">Define your agent's personality and instructions</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            System Prompt <span className="text-red-400">*</span>
          </label>
          <textarea
            value={config.systemPrompt}
            onChange={(e) => updateConfig({ systemPrompt: e.target.value })}
            className="input-field min-h-[300px] font-mono text-sm resize-y"
            placeholder={`You are a helpful assistant that specializes in...

Your role is to:
1. ...
2. ...
3. ...

Guidelines:
- Always be polite and professional
- If you don't know something, say so
- ...`}
          />
          <p className="text-xs text-ink-subtle mt-2">
            This is the core instruction that shapes your agent's behavior. Be specific and clear.
          </p>
        </div>
      </div>

      {/* Prompt Templates */}
      <div className="card bg-surface-muted border-dashed">
        <h4 className="text-sm font-semibold text-ink mb-3">Quick Templates</h4>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Customer Support', prompt: 'You are a friendly and helpful customer support agent. Your role is to assist users with their questions, resolve issues, and provide accurate information about our products and services. Always be polite, patient, and professional. If you cannot help with something, apologize and explain what steps the user should take next.' },
            { label: 'Code Assistant', prompt: 'You are an expert software engineer and code assistant. Help users write, debug, and improve their code. Explain concepts clearly, provide working examples, and follow best practices. Support multiple programming languages and frameworks. Always consider security, performance, and maintainability in your suggestions.' },
            { label: 'Research Analyst', prompt: 'You are a thorough research analyst. When given a topic, provide comprehensive analysis with multiple perspectives. Cite sources when possible, acknowledge uncertainty, and present balanced viewpoints. Structure your responses clearly with summaries and key takeaways.' },
          ].map((template) => (
            <button
              key={template.label}
              onClick={() => updateConfig({ systemPrompt: template.prompt })}
              className="px-3 py-1.5 text-xs bg-surface border border-border rounded-lg hover:border-accent hover:text-accent transition-colors"
            >
              {template.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function ModelStep({ config, updateConfig }: { config: AgentConfig; updateConfig: (u: Partial<AgentConfig>) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">AI Model</h3>
            <p className="text-sm text-ink-muted">Choose the AI model that powers your agent</p>
          </div>
        </div>

        <div className="space-y-3">
          {MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => updateConfig({ model: model.id })}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                config.model === model.id
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-border-light'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-ink">{model.name}</span>
                <span className="text-xs text-ink-subtle">{model.cost}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-accent">{model.provider}</span>
                <span className="text-xs text-ink-muted">• {model.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h4 className="text-sm font-semibold text-ink mb-4">Model Parameters</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-ink-muted mb-2">
              Temperature: {config.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-ink-subtle mt-1">
              <span>Focused</span>
              <span>Creative</span>
            </div>
          </div>
          <div>
            <label className="block text-sm text-ink-muted mb-2">
              Max Tokens: {config.maxTokens}
            </label>
            <input
              type="range"
              min="256"
              max="16384"
              step="256"
              value={config.maxTokens}
              onChange={(e) => updateConfig({ maxTokens: parseInt(e.target.value) })}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-ink-subtle mt-1">
              <span>Short</span>
              <span>Long</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ToolsStep({ config, updateConfig }: { config: AgentConfig; updateConfig: (u: Partial<AgentConfig>) => void }) {
  const toggleTool = (toolId: string) => {
    const newTools = config.tools.includes(toolId)
      ? config.tools.filter((t) => t !== toolId)
      : [...config.tools, toolId];
    updateConfig({ tools: newTools });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">Tools & Capabilities</h3>
            <p className="text-sm text-ink-muted">Enable tools your agent can use</p>
          </div>
        </div>

        <div className="space-y-3">
          {BUILTIN_TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => toggleTool(tool.id)}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                config.tools.includes(tool.id)
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-border-light'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{tool.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-ink">{tool.name}</div>
                  <div className="text-sm text-ink-muted">{tool.description}</div>
                </div>
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                  config.tools.includes(tool.id)
                    ? 'border-accent bg-accent text-white'
                    : 'border-border'
                }`}>
                  {config.tools.includes(tool.id) && <Check className="w-3 h-3" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-ink-subtle mt-4">
          Tools extend your agent's capabilities beyond text generation. Custom webhook tools coming soon.
        </p>
      </div>
    </motion.div>
  );
}

function GuardrailsStep({ 
  config, 
  updateConfig,
  blockedTopicInput,
  setBlockedTopicInput,
}: { 
  config: AgentConfig; 
  updateConfig: (u: Partial<AgentConfig>) => void;
  blockedTopicInput: string;
  setBlockedTopicInput: (v: string) => void;
}) {
  const addBlockedTopic = () => {
    if (blockedTopicInput.trim() && !config.guardrails.blockedTopics.includes(blockedTopicInput.trim())) {
      updateConfig({
        guardrails: {
          ...config.guardrails,
          blockedTopics: [...config.guardrails.blockedTopics, blockedTopicInput.trim()],
        },
      });
      setBlockedTopicInput('');
    }
  };

  const removeBlockedTopic = (topic: string) => {
    updateConfig({
      guardrails: {
        ...config.guardrails,
        blockedTopics: config.guardrails.blockedTopics.filter((t) => t !== topic),
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">Safety & Guardrails</h3>
            <p className="text-sm text-ink-muted">Set limits and safety rules for your agent</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Rate Limits */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-ink-muted mb-2">
                Max Tokens Per Request
              </label>
              <input
                type="number"
                value={config.guardrails.maxTokensPerRequest}
                onChange={(e) => updateConfig({
                  guardrails: { ...config.guardrails, maxTokensPerRequest: parseInt(e.target.value) || 4096 }
                })}
                className="input-field"
                min={100}
                max={128000}
              />
            </div>
            <div>
              <label className="block text-sm text-ink-muted mb-2">
                Max Requests Per Minute
              </label>
              <input
                type="number"
                value={config.guardrails.maxRequestsPerMinute}
                onChange={(e) => updateConfig({
                  guardrails: { ...config.guardrails, maxRequestsPerMinute: parseInt(e.target.value) || 60 }
                })}
                className="input-field"
                min={1}
                max={1000}
              />
            </div>
          </div>

          {/* Blocked Topics */}
          <div>
            <label className="block text-sm text-ink-muted mb-2">
              Blocked Topics
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={blockedTopicInput}
                onChange={(e) => setBlockedTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlockedTopic())}
                className="input-field flex-1"
                placeholder="Enter topic to block..."
              />
              <button onClick={addBlockedTopic} className="btn-secondary">
                Add
              </button>
            </div>
            {config.guardrails.blockedTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {config.guardrails.blockedTopics.map((topic) => (
                  <span
                    key={topic}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-sm"
                  >
                    {topic}
                    <button onClick={() => removeBlockedTopic(topic)} className="hover:text-red-300">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-ink-subtle mt-2">
              Requests containing these topics will be rejected
            </p>
          </div>

          {/* Human Approval */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config.guardrails.requireHumanApproval}
              onChange={(e) => updateConfig({
                guardrails: { ...config.guardrails, requireHumanApproval: e.target.checked }
              })}
              className="w-5 h-5 rounded border-border bg-surface-muted accent-accent"
            />
            <div>
              <span className="text-ink font-medium">Require Human Approval</span>
              <p className="text-sm text-ink-muted">Review and approve responses before they're sent</p>
            </div>
          </label>
        </div>
      </div>
    </motion.div>
  );
}

function ReviewStep({ config }: { config: AgentConfig }) {
  const selectedModel = MODELS.find((m) => m.id === config.model);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Summary */}
      <div className="card bg-accent/5 border-accent/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center">
            <Bot className="w-8 h-8 text-accent" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-ink">{config.name || 'Unnamed Agent'}</h3>
            <p className="text-ink-muted">{config.description || 'No description'}</p>
          </div>
        </div>
      </div>

      {/* Configuration Review */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h4 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-accent" />
            Model
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Model</span>
              <span className="text-ink">{selectedModel?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Provider</span>
              <span className="text-ink">{selectedModel?.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Temperature</span>
              <span className="text-ink">{config.temperature}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Max Tokens</span>
              <span className="text-ink">{config.maxTokens}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            Guardrails
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Max Tokens/Request</span>
              <span className="text-ink">{config.guardrails.maxTokensPerRequest}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Rate Limit</span>
              <span className="text-ink">{config.guardrails.maxRequestsPerMinute}/min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Blocked Topics</span>
              <span className="text-ink">{config.guardrails.blockedTopics.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Human Approval</span>
              <span className={config.guardrails.requireHumanApproval ? 'text-green-400' : 'text-ink'}>
                {config.guardrails.requireHumanApproval ? 'Required' : 'Not required'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h4 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-accent" />
            Tools ({config.tools.length})
          </h4>
          {config.tools.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {config.tools.map((toolId) => {
                const tool = BUILTIN_TOOLS.find((t) => t.id === toolId);
                return (
                  <span key={toolId} className="px-2 py-1 bg-surface-muted rounded text-sm text-ink">
                    {tool?.icon} {tool?.name}
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No tools enabled</p>
          )}
        </div>

        <div className="card">
          <h4 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <Code className="w-4 h-4 text-accent" />
            System Prompt
          </h4>
          <p className="text-sm text-ink-muted line-clamp-4">
            {config.systemPrompt || 'No system prompt defined'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function SuccessStep({ agentId, agentName }: { agentId: string; agentName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-ink mb-2">Agent Created!</h2>
      <p className="text-ink-muted mb-4 max-w-md mx-auto">
        Your <strong>{agentName}</strong> agent has been created. Next, configure API keys and activate it.
      </p>
      <p className="text-sm text-ink-subtle mb-8">
        Agent ID: <code className="bg-surface-muted px-2 py-1 rounded">{agentId}</code>
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link href={`/dashboard/agents/${agentId}`} className="btn-primary">
          <Zap className="w-4 h-4" />
          Configure Agent
        </Link>
        <Link href="/dashboard?tab=hosted" className="btn-secondary">
          View All Agents
        </Link>
      </div>
    </motion.div>
  );
}
