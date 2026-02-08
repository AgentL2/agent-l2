'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, DollarSign, CheckCircle2, AlertCircle, Zap, Cloud, Terminal,
  Plus, X, ChevronRight, ChevronLeft, Loader2, Rocket, Wallet, Eye, EyeOff,
  Settings, Play
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { getAgent, ApiError } from '@/lib/api';
import {
  isWritesConfigured,
  generateDID,
  registerAgent as doRegisterAgent,
  registerService as doRegisterService,
} from '@/lib/writes';
import { 
  EXECUTOR_TEMPLATES, 
  deployHostedAgent,
  type ExecutorTemplate 
} from '@/lib/hosted';

type Step = 'mode' | 'template' | 'service' | 'secrets' | 'deploying' | 'success';

const categories = [
  { id: 'text', name: 'Text & NLP', icon: '💬', serviceType: 'text-generation' },
  { id: 'code', name: 'Code & Dev', icon: '💻', serviceType: 'code-review' },
  { id: 'vision', name: 'Vision', icon: '👁️', serviceType: 'image-analysis' },
  { id: 'data', name: 'Data', icon: '📊', serviceType: 'data-extraction' },
  { id: 'other', name: 'Other', icon: '🔮', serviceType: 'custom' },
];

export default function CreateAgentPage() {
  const router = useRouter();
  const { address, isConnecting, connect, getSigner } = useWallet();
  
  const [step, setStep] = useState<Step>('mode');
  const [mode, setMode] = useState<'hosted' | 'self-hosted' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ExecutorTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    icon: '🤖',
  });
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [config, setConfig] = useState<Record<string, unknown>>({});
  
  // Results
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isFirstTimeAgent, setIsFirstTimeAgent] = useState(false);
  const [hostedAgentId, setHostedAgentId] = useState<string | null>(null);

  // Check if agent already registered
  const [isAgentRegistered, setIsAgentRegistered] = useState<boolean | null>(null);
  useEffect(() => {
    if (!address) {
      setIsAgentRegistered(null);
      return;
    }
    getAgent(address)
      .then(() => setIsAgentRegistered(true))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setIsAgentRegistered(false);
        else setIsAgentRegistered(null);
      });
  }, [address]);

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Select template and pre-fill form
  const handleSelectTemplate = (template: ExecutorTemplate) => {
    setSelectedTemplate(template);
    const cat = categories.find(c => c.serviceType === template.serviceType) || categories[4];
    setFormData({
      name: `My ${template.name} Agent`,
      description: template.description,
      category: cat.id,
      price: '0.001',
      icon: template.icon,
    });
    // Set default config
    const defaults: Record<string, unknown> = {};
    for (const field of template.configFields) {
      if (field.default !== undefined) {
        defaults[field.key] = field.default;
      }
    }
    setConfig(defaults);
    setStep('service');
  };

  // Main submit handler - registers on-chain AND deploys hosted runtime
  const handleSubmit = useCallback(async () => {
    if (!address) {
      connect();
      return;
    }
    
    const signer = await getSigner();
    if (!signer) {
      setError('Could not get wallet signer. Try reconnecting.');
      return;
    }
    
    if (!isWritesConfigured()) {
      setError('Chain not configured. Check environment variables.');
      return;
    }

    setStep('deploying');
    setError(null);

    try {
      const serviceType = categories.find(c => c.id === formData.category)?.serviceType || 'custom';
      const priceWei = ethers.parseEther((formData.price || '0.001').trim());

      // Step 1: Register agent on-chain if needed
      if (!isAgentRegistered) {
        const did = generateDID(address);
        await doRegisterAgent(signer, address, did, formData.description || '');
        setIsFirstTimeAgent(true);
      }

      // Step 2: Register service on-chain
      const { serviceId, txHash } = await doRegisterService(
        signer,
        address,
        serviceType,
        priceWei,
        formData.description?.trim() || ''
      );
      setTxHash(txHash);

      // Step 3: Deploy hosted runtime (if hosted mode)
      if (mode === 'hosted' && selectedTemplate) {
        const hostedAgent = await deployHostedAgent({
          address,
          name: formData.name,
          templateId: selectedTemplate.id,
          config,
          secrets,
        });
        setHostedAgentId(hostedAgent.id);
        
        // Also save to localStorage for persistence (MVP workaround)
        if (typeof window !== 'undefined') {
          try {
            const key = 'agentl2_hosted_agents';
            const stored = localStorage.getItem(key);
            const all = stored ? JSON.parse(stored) : {};
            const existing = all[address.toLowerCase()] || [];
            existing.push(hostedAgent);
            all[address.toLowerCase()] = existing;
            localStorage.setItem(key, JSON.stringify(all));
          } catch {
            // Ignore storage errors
          }
        }
      }

      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setStep('secrets'); // Go back to secrets step
    }
  }, [address, connect, getSigner, formData, isAgentRegistered, mode, selectedTemplate, config, secrets]);

  // Clear error after 5s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const canProceedToSecrets = formData.name && formData.category && formData.price;
  const canDeploy = mode === 'self-hosted' || (selectedTemplate?.requiredSecrets.every(
    s => !s.required || secrets[s.key]?.trim()
  ));

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-bar border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-ink-muted hover:text-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Home</span>
            </Link>
            {!address ? (
              <button onClick={() => connect()} disabled={isConnecting} className="btn-primary text-sm">
                <Wallet className="w-4 h-4" />
                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {isAgentRegistered === false && (
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">New Agent</span>
                )}
                {isAgentRegistered === true && (
                  <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">Agent Active</span>
                )}
                <span className="text-sm text-ink-subtle font-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Connect Wallet Prompt */}
        {!address && step !== 'success' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card border-accent/30 bg-accent/5 mb-8">
            <div className="flex items-center gap-4">
              <Wallet className="w-10 h-10 text-accent" />
              <div className="flex-1">
                <h3 className="font-semibold text-ink">Connect your wallet to continue</h3>
                <p className="text-sm text-ink-muted">Your wallet becomes your agent identity on AgentL2.</p>
              </div>
              <button onClick={() => connect()} className="btn-primary">Connect</button>
            </div>
          </motion.div>
        )}

        {/* Step: Choose Mode */}
        {step === 'mode' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold mb-3 text-ink">Create Your Agent</h1>
              <p className="text-ink-muted">
                {isAgentRegistered === false 
                  ? "Register your wallet as an agent and start earning."
                  : "Add a new service to your agent."}
              </p>
            </div>

            <h2 className="text-lg font-semibold text-ink mb-4">How will your agent run?</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => { setMode('hosted'); setStep('template'); }}
                className="card text-left hover:border-accent/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                    <Cloud className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink group-hover:text-accent flex items-center gap-2">
                      Hosted
                      <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">Recommended</span>
                    </h3>
                    <p className="text-sm text-ink-muted mb-2">We run your agent 24/7. No server needed.</p>
                    <ul className="text-xs text-ink-subtle space-y-1">
                      <li>✓ One-click deployment</li>
                      <li>✓ Automatic order processing</li>
                      <li>✓ 5% platform fee</li>
                    </ul>
                  </div>
                </div>
              </button>

              <button
                onClick={() => { setMode('self-hosted'); setStep('service'); setSelectedTemplate(null); }}
                className="card text-left hover:border-border-light transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center shrink-0">
                    <Terminal className="w-6 h-6 text-ink-muted" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">Self-Hosted</h3>
                    <p className="text-sm text-ink-muted mb-2">Run the runtime on your own server.</p>
                    <ul className="text-xs text-ink-subtle space-y-1">
                      <li>✓ Full control</li>
                      <li>✓ Custom executors</li>
                      <li>✓ No platform fee</li>
                    </ul>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: Choose Template (Hosted only) */}
        {step === 'template' && mode === 'hosted' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <button onClick={() => setStep('mode')} className="btn-ghost mb-6">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            
            <h2 className="text-2xl font-bold mb-2 text-ink">Choose a Template</h2>
            <p className="text-ink-muted mb-6">Pre-configured executors for common AI tasks.</p>

            <div className="grid gap-3">
              {EXECUTOR_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="card text-left hover:border-accent/50 transition-all group p-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{template.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink group-hover:text-accent">{template.name}</span>
                        {template.popular && (
                          <span className="px-2 py-0.5 text-xs rounded bg-accent/20 text-accent">Popular</span>
                        )}
                      </div>
                      <p className="text-sm text-ink-muted">{template.description}</p>
                      <p className="text-xs text-ink-subtle mt-1">Est. {template.estimatedCostPer1k}/1k requests</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-ink-muted group-hover:text-accent" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step: Service Details */}
        {step === 'service' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <button onClick={() => setStep(mode === 'hosted' ? 'template' : 'mode')} className="btn-ghost mb-6">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-2xl font-bold mb-2 text-ink">
              {selectedTemplate ? `Configure ${selectedTemplate.name}` : 'Service Details'}
            </h2>
            <p className="text-ink-muted mb-6">Define what your agent offers on the marketplace.</p>

            <div className="card space-y-6">
              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {['🤖', '🔮', '💻', '📊', '🎨', '🔍', '⚡', '🧠', '🎯', '🚀'].map((icon) => (
                    <button
                      key={icon}
                      onClick={() => updateForm('icon', icon)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center ${
                        formData.icon === icon ? 'bg-accent/20 border-2 border-accent' : 'bg-surface-muted'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  className="input-field"
                  placeholder="My AI Agent"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Category *</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateForm('category', cat.id)}
                      className={`px-4 py-2 rounded-lg text-sm ${
                        formData.category === cat.id
                          ? 'bg-accent text-white'
                          : 'bg-surface-muted text-ink-muted hover:text-ink'
                      }`}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  className="input-field"
                  rows={2}
                  placeholder="What does your agent do?"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Price per Request (ETH) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => updateForm('price', e.target.value)}
                    className="input-field pl-10"
                    placeholder="0.001"
                    step="0.0001"
                  />
                </div>
                <p className="text-xs text-ink-subtle mt-1">
                  You receive {formData.price ? (parseFloat(formData.price) * 0.975).toFixed(6) : '0'} ETH (after 2.5% fee)
                </p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setStep('secrets')}
                disabled={!canProceedToSecrets}
                className="btn-primary disabled:opacity-50"
              >
                {mode === 'hosted' ? 'Configure API Keys' : 'Review'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: Secrets (Hosted) or Review (Self-hosted) */}
        {step === 'secrets' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <button onClick={() => setStep('service')} className="btn-ghost mb-6">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {mode === 'hosted' && selectedTemplate ? (
              <>
                <h2 className="text-2xl font-bold mb-2 text-ink">API Keys & Configuration</h2>
                <p className="text-ink-muted mb-6">Your keys are encrypted and never exposed.</p>

                <div className="card space-y-6">
                  {/* Secrets */}
                  {selectedTemplate.requiredSecrets.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-ink-muted mb-2">
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
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                        >
                          {showSecrets[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-ink-subtle mt-1">{field.description}</p>
                    </div>
                  ))}

                  {/* Config fields */}
                  {selectedTemplate.configFields.length > 0 && (
                    <>
                      <div className="border-t border-border pt-6">
                        <h3 className="font-medium text-ink mb-4">Settings</h3>
                        {selectedTemplate.configFields.map((field) => (
                          <div key={field.key} className="mb-4">
                            <label className="block text-sm text-ink-muted mb-2">{field.label}</label>
                            {field.type === 'select' ? (
                              <select
                                value={String(config[field.key] ?? field.default ?? '')}
                                onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                                className="input-field"
                              >
                                {field.options?.map((opt) => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            ) : field.type === 'boolean' ? (
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(config[field.key] ?? field.default)}
                                  onChange={(e) => setConfig({ ...config, [field.key]: e.target.checked })}
                                />
                                <span className="text-sm text-ink">{field.description}</span>
                              </label>
                            ) : (
                              <input
                                type={field.type === 'number' ? 'number' : 'text'}
                                value={String(config[field.key] ?? field.default ?? '')}
                                onChange={(e) => setConfig({ ...config, [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value })}
                                className="input-field"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2 text-ink">Review</h2>
                <p className="text-ink-muted mb-6">Confirm your service details.</p>

                <div className="card">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-4xl">{formData.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold text-ink">{formData.name}</h3>
                      <p className="text-ink-muted">{formData.description}</p>
                    </div>
                  </div>
                  <div className="border-t border-border pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Category</span>
                      <span>{categories.find(c => c.id === formData.category)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Price</span>
                      <span className="text-accent font-semibold">{formData.price} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-muted">Execution</span>
                      <span>Self-Hosted</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Summary */}
            <div className="card bg-surface-muted mt-6">
              <h4 className="font-medium text-ink mb-3">When you deploy:</h4>
              <ol className="space-y-2 text-sm text-ink-muted">
                {isAgentRegistered === false && (
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs">1</span>
                    Register your wallet as an agent on-chain
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs">{isAgentRegistered === false ? '2' : '1'}</span>
                  List your service on the marketplace
                </li>
                {mode === 'hosted' && (
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs">{isAgentRegistered === false ? '3' : '2'}</span>
                    Start your hosted runtime (processes orders automatically)
                  </li>
                )}
              </ol>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={handleSubmit}
                disabled={!canDeploy || !address}
                className="btn-primary disabled:opacity-50"
              >
                <Rocket className="w-4 h-4" />
                {isAgentRegistered === false ? 'Create Agent & Deploy' : 'Deploy Service'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step: Deploying */}
        {step === 'deploying' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2 text-ink">Deploying Your Agent</h2>
            <p className="text-ink-muted">
              {isAgentRegistered === false ? 'Registering agent and service on-chain...' : 'Registering service...'}
            </p>
          </motion.div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="card max-w-md mx-auto">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-2 text-ink">
                {isFirstTimeAgent ? 'Agent Created!' : 'Service Deployed!'}
              </h2>
              <p className="text-ink-muted mb-6">
                {mode === 'hosted'
                  ? 'Your agent is now running and processing orders.'
                  : 'Your service is listed. Set up the runtime to start processing.'}
              </p>

              {txHash && (
                <div className="p-3 bg-surface-muted rounded-lg mb-4 text-left">
                  <div className="text-xs text-ink-subtle mb-1">Transaction</div>
                  <code className="text-xs text-accent break-all">{txHash}</code>
                </div>
              )}

              {mode === 'hosted' && (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-6 text-left">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Play className="w-5 h-5" />
                    <span className="font-semibold">Runtime Active</span>
                  </div>
                  <p className="text-sm text-ink-muted">
                    Your agent is now running 24/7 and will automatically process incoming orders.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Link href="/dashboard?tab=hosted" className="btn-primary w-full">
                  View Dashboard
                </Link>
                <Link href="/marketplace" className="btn-secondary w-full">
                  Browse Marketplace
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error Toast */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-4 right-4 max-w-sm p-4 bg-surface-elevated border border-red-500/40 rounded-lg shadow-lg"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-ink">{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-ink-muted hover:text-ink">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
