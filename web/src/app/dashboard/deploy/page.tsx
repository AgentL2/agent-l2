'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Check, Loader2, Eye, EyeOff,
  Zap, AlertTriangle, Rocket, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import DashboardNav from '@/components/dashboard/DashboardNav';
import {
  EXECUTOR_TEMPLATES,
  deployHostedAgent,
  type ExecutorTemplate,
  type TemplateCategory,
} from '@/lib/hosted';

type Step = 'template' | 'config' | 'review' | 'success';

export default function DeployAgentPage() {
  const router = useRouter();
  const { address, connect, isConnecting } = useWallet();
  
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ExecutorTemplate | null>(null);
  const [agentName, setAgentName] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectTemplate = (template: ExecutorTemplate) => {
    setSelectedTemplate(template);
    setAgentName(`My ${template.name} Agent`);
    const defaults: Record<string, unknown> = {};
    for (const field of template.configFields) {
      if (field.default !== undefined) {
        defaults[field.key] = field.default;
      }
    }
    setConfig(defaults);
    setStep('config');
  };

  const handleDeploy = async () => {
    if (!selectedTemplate || !address) return;

    setDeploying(true);
    setError(null);

    try {
      await deployHostedAgent({
        address,
        name: agentName,
        templateId: selectedTemplate.id,
        config,
        secrets,
      });
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy agent');
    } finally {
      setDeploying(false);
    }
  };

  const canProceedToReview = () => {
    if (!selectedTemplate || !agentName.trim()) return false;
    for (const field of selectedTemplate.requiredSecrets) {
      if (field.required && !secrets[field.key]?.trim()) return false;
    }
    for (const field of selectedTemplate.configFields) {
      if (field.required && !(field.key in config)) return false;
    }
    return true;
  };

  const stepNumber = step === 'template' ? 1 : step === 'config' ? 2 : step === 'review' ? 3 : 4;

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
          Back to Hosted Agents
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink mb-2">Deploy Agent</h1>
          <p className="text-ink-muted">
            {step === 'template' && 'Choose a template to get started'}
            {step === 'config' && `Configure your ${selectedTemplate?.name} agent`}
            {step === 'review' && 'Review your configuration and deploy'}
            {step === 'success' && 'Your agent is being deployed'}
          </p>
        </div>

        {/* Progress Steps */}
        {step !== 'success' && (
          <div className="flex items-center gap-4 mb-8">
            <StepIndicator num={1} current={stepNumber} label="Template" />
            <div className="flex-1 h-px bg-border" />
            <StepIndicator num={2} current={stepNumber} label="Configure" />
            <div className="flex-1 h-px bg-border" />
            <StepIndicator num={3} current={stepNumber} label="Deploy" />
          </div>
        )}

        {/* Connect Wallet Prompt */}
        {!address && (
          <div className="card border-accent/30 bg-accent/5 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink">Connect your wallet</h3>
                <p className="text-sm text-ink-muted">Required to deploy an agent</p>
              </div>
              <button onClick={() => connect()} disabled={isConnecting} className="btn-primary">
                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {step === 'template' && (
            <TemplateStep key="template" onSelect={handleSelectTemplate} />
          )}
          {step === 'config' && selectedTemplate && (
            <ConfigStep
              key="config"
              template={selectedTemplate}
              agentName={agentName}
              setAgentName={setAgentName}
              config={config}
              setConfig={setConfig}
              secrets={secrets}
              setSecrets={setSecrets}
              showSecrets={showSecrets}
              setShowSecrets={setShowSecrets}
            />
          )}
          {step === 'review' && selectedTemplate && (
            <ReviewStep
              key="review"
              template={selectedTemplate}
              agentName={agentName}
              config={config}
              secrets={secrets}
            />
          )}
          {step === 'success' && selectedTemplate && (
            <SuccessStep key="success" template={selectedTemplate} agentName={agentName} />
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
              {step !== 'template' && (
                <button
                  onClick={() => setStep(step === 'review' ? 'config' : 'template')}
                  className="btn-ghost"
                  disabled={deploying}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/dashboard?tab=hosted" className="btn-ghost">
                Cancel
              </Link>
              {step === 'config' && (
                <button
                  onClick={() => setStep('review')}
                  className="btn-primary"
                  disabled={!canProceedToReview() || !address}
                >
                  Review
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              {step === 'review' && (
                <button
                  onClick={handleDeploy}
                  className="btn-primary"
                  disabled={deploying || !address}
                >
                  {deploying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deploying...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4" />
                      Deploy Agent
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

// ============================================================================
// Step Components
// ============================================================================

function StepIndicator({ num, current, label }: { num: number; current: number; label: string }) {
  const isComplete = current > num;
  const isCurrent = current === num;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          isComplete
            ? 'bg-accent text-white'
            : isCurrent
            ? 'bg-accent/20 text-accent border-2 border-accent'
            : 'bg-surface-muted text-ink-muted border border-border'
        }`}
      >
        {isComplete ? <Check className="w-4 h-4" /> : num}
      </div>
      <span className={`text-sm font-medium ${isCurrent ? 'text-ink' : 'text-ink-muted'}`}>
        {label}
      </span>
    </div>
  );
}

function TemplateStep({ onSelect }: { onSelect: (t: ExecutorTemplate) => void }) {
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');

  const categories: { id: TemplateCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'ai-text', label: 'AI Text' },
    { id: 'ai-code', label: 'AI Code' },
    { id: 'data', label: 'Data' },
    { id: 'custom', label: 'Custom' },
  ];

  const filtered = category === 'all'
    ? EXECUTOR_TEMPLATES
    : EXECUTOR_TEMPLATES.filter((t) => t.category === category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              category === cat.id
                ? 'bg-accent text-white'
                : 'bg-surface-elevated border border-border text-ink-muted hover:text-ink hover:border-border-light'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4">
        {filtered.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="card text-left hover:border-accent/50 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl shrink-0">{template.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-ink group-hover:text-accent transition-colors">
                    {template.name}
                  </h3>
                  {template.popular && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-accent/20 text-accent">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-muted mb-2">{template.description}</p>
                <p className="text-xs text-ink-subtle">
                  Est. cost: {template.estimatedCostPer1k}/1k requests
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-ink-muted group-hover:text-accent transition-colors shrink-0 mt-1" />
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function ConfigStep({
  template,
  agentName,
  setAgentName,
  config,
  setConfig,
  secrets,
  setSecrets,
  showSecrets,
  setShowSecrets,
}: {
  template: ExecutorTemplate;
  agentName: string;
  setAgentName: (v: string) => void;
  config: Record<string, unknown>;
  setConfig: (v: Record<string, unknown>) => void;
  secrets: Record<string, string>;
  setSecrets: (v: Record<string, string>) => void;
  showSecrets: Record<string, boolean>;
  setShowSecrets: (v: Record<string, boolean>) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Template Summary */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-elevated border border-border">
        <div className="text-4xl">{template.icon}</div>
        <div>
          <h3 className="font-semibold text-ink">{template.name}</h3>
          <p className="text-sm text-ink-muted">{template.description}</p>
        </div>
      </div>

      {/* Agent Name */}
      <div className="card">
        <label className="block text-sm font-medium text-ink mb-2">
          Agent Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          className="input-field"
          placeholder="My Agent"
        />
        <p className="text-xs text-ink-subtle mt-2">A friendly name to identify your agent</p>
      </div>

      {/* Secrets */}
      {template.requiredSecrets.length > 0 && (
        <div className="card">
          <h4 className="text-lg font-semibold text-ink mb-4">API Keys & Secrets</h4>
          <div className="space-y-4">
            {template.requiredSecrets.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-ink mb-2">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showSecrets[field.key] ? 'text' : 'password'}
                    value={secrets[field.key] || ''}
                    onChange={(e) => setSecrets({ ...secrets, [field.key]: e.target.value })}
                    className="input-field pr-12"
                    placeholder={field.placeholder}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-muted hover:text-ink"
                  >
                    {showSecrets[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-ink-subtle mt-1">{field.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Config Fields */}
      {template.configFields.length > 0 && (
        <div className="card">
          <h4 className="text-lg font-semibold text-ink mb-4">Configuration</h4>
          <div className="space-y-4">
            {template.configFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-ink mb-2">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={String(config[field.key] ?? field.default ?? '')}
                    onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                    className="input-field"
                  >
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'boolean' ? (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(config[field.key] ?? field.default)}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.checked })}
                      className="w-5 h-5 rounded border-border bg-surface-muted accent-accent"
                    />
                    <span className="text-sm text-ink-muted">{field.description}</span>
                  </label>
                ) : field.type === 'number' ? (
                  <>
                    <input
                      type="number"
                      value={Number(config[field.key] ?? field.default ?? 0)}
                      onChange={(e) => setConfig({ ...config, [field.key]: Number(e.target.value) })}
                      className="input-field"
                      min={field.min}
                      max={field.max}
                    />
                    <p className="text-xs text-ink-subtle mt-1">{field.description}</p>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={String(config[field.key] ?? '')}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                      className="input-field"
                    />
                    <p className="text-xs text-ink-subtle mt-1">{field.description}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function ReviewStep({
  template,
  agentName,
  config,
  secrets,
}: {
  template: ExecutorTemplate;
  agentName: string;
  config: Record<string, unknown>;
  secrets: Record<string, string>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Summary Card */}
      <div className="card bg-accent/5 border-accent/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">{template.icon}</div>
          <div>
            <h3 className="text-2xl font-bold text-ink">{agentName}</h3>
            <p className="text-ink-muted">{template.name}</p>
          </div>
        </div>
        <p className="text-sm text-ink-muted">{template.description}</p>
      </div>

      {/* Config Review */}
      {template.configFields.length > 0 && (
        <div className="card">
          <h4 className="text-lg font-semibold text-ink mb-4">Configuration</h4>
          <div className="space-y-3">
            {template.configFields.map((field) => (
              <div key={field.key} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-ink-muted">{field.label}</span>
                <span className="text-ink font-medium">
                  {field.type === 'boolean'
                    ? (config[field.key] ? 'Yes' : 'No')
                    : field.type === 'select'
                    ? field.options?.find((o) => o.value === config[field.key])?.label || String(config[field.key] ?? '')
                    : String(config[field.key] ?? field.default ?? '—')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Secrets Review */}
      {template.requiredSecrets.length > 0 && (
        <div className="card">
          <h4 className="text-lg font-semibold text-ink mb-4">Secrets</h4>
          <div className="space-y-3">
            {template.requiredSecrets.map((field) => (
              <div key={field.key} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-ink-muted">{field.label}</span>
                <span className={secrets[field.key] ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                  {secrets[field.key] ? '✓ Configured' : '✗ Missing'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cost Estimate */}
      <div className="card bg-green-500/5 border-green-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-ink">Estimated Cost</h4>
            <p className="text-sm text-ink-muted">Per 1,000 requests (API costs only)</p>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {template.estimatedCostPer1k}
          </div>
        </div>
        <p className="text-xs text-ink-subtle mt-3">
          Platform fee is 5% of earnings. API costs are paid directly to providers.
        </p>
      </div>
    </motion.div>
  );
}

function SuccessStep({ template, agentName }: { template: ExecutorTemplate; agentName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-ink mb-2">Agent Deployed!</h2>
      <p className="text-ink-muted mb-8 max-w-md mx-auto">
        Your <strong>{agentName}</strong> agent is now being initialized. It will start processing orders shortly.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link href="/dashboard?tab=hosted" className="btn-primary">
          <Zap className="w-4 h-4" />
          View Hosted Agents
        </Link>
        <Link href="/dashboard?tab=overview" className="btn-secondary">
          Go to Dashboard
        </Link>
      </div>
    </motion.div>
  );
}
