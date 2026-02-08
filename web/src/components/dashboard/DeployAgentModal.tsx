'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, ChevronLeft, Check, Loader2, Eye, EyeOff,
  Zap, AlertTriangle
} from 'lucide-react';
import {
  EXECUTOR_TEMPLATES,
  deployHostedAgent,
  type ExecutorTemplate,
  type TemplateCategory,
} from '@/lib/hosted';

interface DeployAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeployed: () => void;
  address: string;
}

type Step = 'template' | 'config' | 'review';

export default function DeployAgentModal({
  isOpen,
  onClose,
  onDeployed,
  address,
}: DeployAgentModalProps) {
  const [step, setStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ExecutorTemplate | null>(null);
  const [agentName, setAgentName] = useState('');
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [deploying, setDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setStep('template');
    setSelectedTemplate(null);
    setAgentName('');
    setConfig({});
    setSecrets({});
    setShowSecrets({});
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSelectTemplate = (template: ExecutorTemplate) => {
    setSelectedTemplate(template);
    setAgentName(`My ${template.name} Agent`);
    // Set defaults
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
    if (!selectedTemplate) return;

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
      resetState();
      onDeployed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy agent');
    } finally {
      setDeploying(false);
    }
  };

  const canProceedToReview = () => {
    if (!selectedTemplate || !agentName.trim()) return false;
    // Check required secrets
    for (const field of selectedTemplate.requiredSecrets) {
      if (field.required && !secrets[field.key]?.trim()) return false;
    }
    // Check required config
    for (const field of selectedTemplate.configFields) {
      if (field.required && !(field.key in config)) return false;
    }
    return true;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl max-h-[85vh] overflow-hidden bg-surface-elevated border border-border rounded-2xl shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-bold text-ink">Deploy Agent</h2>
            <p className="text-sm text-ink-muted">
              {step === 'template' && 'Choose a template to get started'}
              {step === 'config' && `Configure ${selectedTemplate?.name}`}
              {step === 'review' && 'Review and deploy'}
            </p>
          </div>
          <button onClick={handleClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 px-6 py-3 bg-surface-muted border-b border-border">
          <StepIndicator step={1} current={step} label="Template" />
          <div className="flex-1 h-px bg-border" />
          <StepIndicator step={2} current={step} label="Configure" />
          <div className="flex-1 h-px bg-border" />
          <StepIndicator step={3} current={step} label="Deploy" />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          <AnimatePresence mode="wait">
            {step === 'template' && (
              <TemplateStep
                key="template"
                onSelect={handleSelectTemplate}
              />
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
          </AnimatePresence>

          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-surface-muted">
          <div>
            {step !== 'template' && (
              <button
                onClick={() => setStep(step === 'review' ? 'config' : 'template')}
                className="btn-ghost"
                disabled={deploying}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="btn-ghost" disabled={deploying}>
              Cancel
            </button>
            {step === 'config' && (
              <button
                onClick={() => setStep('review')}
                className="btn-primary"
                disabled={!canProceedToReview()}
              >
                Review
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={handleDeploy}
                className="btn-primary"
                disabled={deploying}
              >
                {deploying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Deploy Agent
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Step Components
// ============================================================================

function StepIndicator({
  step,
  current,
  label,
}: {
  step: number;
  current: Step;
  label: string;
}) {
  const stepMap = { template: 1, config: 2, review: 3 };
  const currentNum = stepMap[current];
  const isComplete = currentNum > step;
  const isCurrent = currentNum === step;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          isComplete
            ? 'bg-accent text-white'
            : isCurrent
            ? 'bg-accent/20 text-accent border border-accent'
            : 'bg-surface-muted text-ink-muted border border-border'
        }`}
      >
        {isComplete ? <Check className="w-3 h-3" /> : step}
      </div>
      <span className={`text-sm ${isCurrent ? 'text-ink font-medium' : 'text-ink-muted'}`}>
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              category === cat.id
                ? 'bg-accent text-white'
                : 'bg-surface-muted text-ink-muted hover:text-ink'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="card text-left hover:border-accent/50 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{template.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink group-hover:text-accent transition-colors">
                    {template.name}
                  </h3>
                  {template.popular && (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-accent/20 text-accent">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-muted line-clamp-2 mt-1">
                  {template.description}
                </p>
                <p className="text-xs text-ink-subtle mt-2">
                  Est. cost: {template.estimatedCostPer1k}/1k requests
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-ink-muted group-hover:text-accent transition-colors shrink-0" />
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Template Summary */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-surface-muted">
        <div className="text-4xl">{template.icon}</div>
        <div>
          <h3 className="font-semibold text-ink">{template.name}</h3>
          <p className="text-sm text-ink-muted">{template.description}</p>
        </div>
      </div>

      {/* Agent Name */}
      <div>
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
      </div>

      {/* Secrets */}
      {template.requiredSecrets.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-ink mb-3">API Keys & Secrets</h4>
          <div className="space-y-4">
            {template.requiredSecrets.map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-ink-muted mb-2">
                  {field.label} {field.required && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showSecrets[field.key] ? 'text' : 'password'}
                    value={secrets[field.key] || ''}
                    onChange={(e) => setSecrets({ ...secrets, [field.key]: e.target.value })}
                    className="input-field pr-10"
                    placeholder={field.placeholder}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets({ ...showSecrets, [field.key]: !showSecrets[field.key] })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-ink-muted hover:text-ink"
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
        <div>
          <h4 className="text-sm font-medium text-ink mb-3">Configuration</h4>
          <div className="space-y-4">
            {template.configFields.map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-ink-muted mb-2">
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
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(config[field.key] ?? field.default)}
                      onChange={(e) => setConfig({ ...config, [field.key]: e.target.checked })}
                      className="w-4 h-4 rounded border-border bg-surface-muted"
                    />
                    <span className="text-sm text-ink">{field.description}</span>
                  </label>
                ) : field.type === 'number' ? (
                  <input
                    type="number"
                    value={Number(config[field.key] ?? field.default ?? 0)}
                    onChange={(e) => setConfig({ ...config, [field.key]: Number(e.target.value) })}
                    className="input-field"
                    min={field.min}
                    max={field.max}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(config[field.key] ?? '')}
                    onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                    className="input-field"
                  />
                )}
                {field.type !== 'boolean' && (
                  <p className="text-xs text-ink-subtle mt-1">{field.description}</p>
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Summary Card */}
      <div className="card bg-accent/5 border-accent/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">{template.icon}</div>
          <div>
            <h3 className="text-xl font-bold text-ink">{agentName}</h3>
            <p className="text-ink-muted">{template.name}</p>
          </div>
        </div>
        <p className="text-sm text-ink-muted">{template.description}</p>
      </div>

      {/* Config Review */}
      <div className="card">
        <h4 className="text-sm font-medium text-ink mb-4">Configuration</h4>
        <div className="space-y-2 text-sm">
          {template.configFields.map((field) => (
            <div key={field.key} className="flex justify-between">
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

      {/* Secrets Review */}
      <div className="card">
        <h4 className="text-sm font-medium text-ink mb-4">Secrets Configured</h4>
        <div className="space-y-2 text-sm">
          {template.requiredSecrets.map((field) => (
            <div key={field.key} className="flex justify-between">
              <span className="text-ink-muted">{field.label}</span>
              <span className={secrets[field.key] ? 'text-green-400' : 'text-red-400'}>
                {secrets[field.key] ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Estimate */}
      <div className="card bg-green-500/5 border-green-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-ink">Estimated Cost</h4>
            <p className="text-sm text-ink-muted">Per 1,000 requests (API costs only)</p>
          </div>
          <div className="text-2xl font-bold text-green-400">
            {template.estimatedCostPer1k}
          </div>
        </div>
        <p className="text-xs text-ink-subtle mt-2">
          * Platform fee is 5% of earnings. API costs are paid directly to providers (OpenAI, etc.)
        </p>
      </div>
    </motion.div>
  );
}
