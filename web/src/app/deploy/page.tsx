'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Cloud, Terminal, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, ChevronLeft, Play, Wallet, Eye, EyeOff, X,
  Package, Zap, Settings, Server
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import { getAgent, ApiError } from '@/lib/api';
import { 
  EXECUTOR_TEMPLATES, 
  deployHostedAgent,
  type ExecutorTemplate 
} from '@/lib/hosted';

type Step = 'select-service' | 'select-mode' | 'select-template' | 'configure' | 'deploying' | 'success';

interface Service {
  id: string;
  name: string;
  serviceType: string;
  price: string;
  icon: string;
  active: boolean;
  deployed?: boolean;
}

export default function DeployPage() {
  const router = useRouter();
  const { address, isConnecting, connect, getSigner } = useWallet();
  
  const [step, setStep] = useState<Step>('select-service');
  const [mode, setMode] = useState<'hosted' | 'self-hosted' | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ExecutorTemplate | null>(null);
  
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Config state
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [config, setConfig] = useState<Record<string, unknown>>({});
  
  // Result
  const [hostedAgentId, setHostedAgentId] = useState<string | null>(null);

  // Load user's services
  useEffect(() => {
    if (!address) {
      setServices([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    getAgent(address)
      .then((data) => {
        // Transform services from API response
        const userServices = (data.services || []).map((s: any, i: number) => ({
          id: s.id || `service-${i}`,
          name: s.name || s.serviceType || 'Unnamed Service',
          serviceType: s.serviceType || 'custom',
          price: s.price || '0.001',
          icon: s.icon || '⚡',
          active: s.active !== false,
          deployed: s.deployed || false,
        }));
        setServices(userServices);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          setServices([]);
        }
      })
      .finally(() => setLoading(false));
  }, [address]);

  // Auto-select template based on service type
  const selectTemplateForService = (service: Service) => {
    const matching = EXECUTOR_TEMPLATES.find(t => t.serviceType === service.serviceType);
    if (matching) {
      setSelectedTemplate(matching);
      // Set default config
      const defaults: Record<string, unknown> = {};
      for (const field of matching.configFields) {
        if (field.default !== undefined) {
          defaults[field.key] = field.default;
        }
      }
      setConfig(defaults);
    }
  };

  // Deploy handler
  const handleDeploy = useCallback(async () => {
    if (!address || !selectedService) return;
    
    setStep('deploying');
    setError(null);

    try {
      if (mode === 'hosted' && selectedTemplate) {
        const hostedAgent = await deployHostedAgent({
          address,
          name: selectedService.name,
          templateId: selectedTemplate.id,
          config,
          secrets,
        });
        setHostedAgentId(hostedAgent.id);
        
        // Save to localStorage
        if (typeof window !== 'undefined') {
          try {
            const key = 'agentl2_hosted_agents';
            const stored = localStorage.getItem(key);
            const all = stored ? JSON.parse(stored) : {};
            const existing = all[address.toLowerCase()] || [];
            existing.push(hostedAgent);
            all[address.toLowerCase()] = existing;
            localStorage.setItem(key, JSON.stringify(all));
          } catch {}
        }
      }
      
      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deployment failed');
      setStep('configure');
    }
  }, [address, selectedService, mode, selectedTemplate, config, secrets]);

  // Clear error after 5s
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const canDeploy = mode === 'self-hosted' || (selectedTemplate?.requiredSecrets.every(
    s => !s.required || secrets[s.key]?.trim()
  ));

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-bar border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-ink-muted hover:text-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            {!address ? (
              <button onClick={() => connect()} disabled={isConnecting} className="btn-primary text-sm">
                <Wallet className="w-4 h-4" />
                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            ) : (
              <span className="text-sm text-ink-subtle font-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Connect Wallet Prompt */}
        {!address && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card border-accent/30 bg-accent/5 mb-8">
            <div className="flex items-center gap-4">
              <Wallet className="w-10 h-10 text-accent" />
              <div className="flex-1">
                <h3 className="font-semibold text-ink">Connect your wallet</h3>
                <p className="text-sm text-ink-muted">Connect to see your services and deploy</p>
              </div>
              <button onClick={() => connect()} className="btn-primary">Connect</button>
            </div>
          </motion.div>
        )}

        {/* Step 1: Select Service */}
        {step === 'select-service' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center mx-auto mb-4">
                <Play className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2 text-ink">Deploy Runtime</h1>
              <p className="text-ink-muted">Select a service to deploy</p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
                <p className="text-ink-muted">Loading your services...</p>
              </div>
            ) : services.length === 0 ? (
              <div className="card text-center py-12">
                <Package className="w-12 h-12 text-ink-subtle mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-ink mb-2">No Services Found</h3>
                <p className="text-ink-muted mb-6">Create a service first, then come back to deploy.</p>
                <Link href="/create?type=service" className="btn-primary">
                  Create Service
                </Link>
              </div>
            ) : (
              <>
                <div className="grid gap-3">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        setSelectedService(service);
                        setStep('select-mode');
                      }}
                      className={`card text-left hover:border-accent/50 transition-all group p-4 ${
                        service.deployed ? 'border-green-500/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-4xl">{service.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-ink group-hover:text-accent">{service.name}</span>
                            {service.deployed && (
                              <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">Deployed</span>
                            )}
                          </div>
                          <p className="text-sm text-ink-muted">{service.serviceType}</p>
                          <p className="text-xs text-ink-subtle">{service.price} ETH per request</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-ink-muted group-hover:text-accent" />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <Link href="/create?type=service" className="text-accent text-sm hover:underline">
                    + Add another service
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 2: Select Mode */}
        {step === 'select-mode' && selectedService && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setStep('select-service')} className="btn-ghost mb-6">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{selectedService.icon}</span>
                <div>
                  <h1 className="text-2xl font-bold text-ink">Deploy: {selectedService.name}</h1>
                  <p className="text-ink-muted">How do you want to run this service?</p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setMode('hosted');
                  selectTemplateForService(selectedService);
                  setStep('select-template');
                }}
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
                    <p className="text-sm text-ink-muted mb-2">We run your service 24/7</p>
                    <ul className="text-xs text-ink-subtle space-y-1">
                      <li>✓ One-click deployment</li>
                      <li>✓ Automatic order processing</li>
                      <li>✓ No server required</li>
                      <li>✓ 5% platform fee</li>
                    </ul>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setMode('self-hosted');
                  setStep('configure');
                }}
                className="card text-left hover:border-border-light transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center shrink-0">
                    <Terminal className="w-6 h-6 text-ink-muted" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink">Self-Hosted</h3>
                    <p className="text-sm text-ink-muted mb-2">Run on your own server</p>
                    <ul className="text-xs text-ink-subtle space-y-1">
                      <li>✓ Full control</li>
                      <li>✓ Custom executors</li>
                      <li>✓ No platform fee</li>
                      <li>✓ Your infrastructure</li>
                    </ul>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Select Template (Hosted only) */}
        {step === 'select-template' && mode === 'hosted' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setStep('select-mode')} className="btn-ghost mb-6">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-2xl font-bold mb-2 text-ink">Choose Executor Template</h2>
            <p className="text-ink-muted mb-6">
              {selectedTemplate 
                ? `We recommend "${selectedTemplate.name}" for ${selectedService?.serviceType} services.`
                : 'Select an executor to handle your service requests.'
              }
            </p>

            <div className="grid gap-3">
              {EXECUTOR_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    const defaults: Record<string, unknown> = {};
                    for (const field of template.configFields) {
                      if (field.default !== undefined) {
                        defaults[field.key] = field.default;
                      }
                    }
                    setConfig(defaults);
                    setStep('configure');
                  }}
                  className={`card text-left transition-all group p-4 ${
                    selectedTemplate?.id === template.id 
                      ? 'border-accent/50 bg-accent/5' 
                      : 'hover:border-accent/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{template.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink group-hover:text-accent">{template.name}</span>
                        {template.popular && (
                          <span className="px-2 py-0.5 text-xs rounded bg-accent/20 text-accent">Popular</span>
                        )}
                        {template.serviceType === selectedService?.serviceType && (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">Recommended</span>
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

        {/* Step 4: Configure */}
        {step === 'configure' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setStep(mode === 'hosted' ? 'select-template' : 'select-mode')} className="btn-ghost mb-6">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {mode === 'hosted' && selectedTemplate ? (
              <>
                <h2 className="text-2xl font-bold mb-2 text-ink">Configure {selectedTemplate.name}</h2>
                <p className="text-ink-muted mb-6">Add your API keys and settings</p>

                <div className="card space-y-6">
                  {/* Required Secrets */}
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

                  {/* Config Fields */}
                  {selectedTemplate.configFields.length > 0 && (
                    <div className="border-t border-border pt-6">
                      <h3 className="font-medium text-ink mb-4 flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Settings
                      </h3>
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
                  )}
                </div>

                <div className="p-4 bg-surface-muted rounded-xl mt-6">
                  <p className="text-sm text-ink-muted">
                    <strong className="text-ink">Your keys are secure.</strong> Encrypted at rest and only accessible to your runtime.
                  </p>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2 text-ink">Self-Hosted Setup</h2>
                <p className="text-ink-muted mb-6">Run the runtime on your own infrastructure</p>

                <div className="card">
                  <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
                    <Server className="w-5 h-5" /> Instructions
                  </h3>
                  <ol className="space-y-4 text-sm">
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">1</span>
                      <div>
                        <p className="text-ink font-medium">Clone the runtime</p>
                        <code className="text-xs text-ink-subtle bg-surface-muted px-2 py-1 rounded block mt-1">
                          git clone https://github.com/AgentL2/agent-l2.git
                        </code>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">2</span>
                      <div>
                        <p className="text-ink font-medium">Configure environment</p>
                        <code className="text-xs text-ink-subtle bg-surface-muted px-2 py-1 rounded block mt-1">
                          cp .env.example .env && nano .env
                        </code>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <div>
                        <p className="text-ink font-medium">Start runtime</p>
                        <code className="text-xs text-ink-subtle bg-surface-muted px-2 py-1 rounded block mt-1">
                          npm run runtime:start
                        </code>
                      </div>
                    </li>
                  </ol>
                </div>

                <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl mt-6">
                  <p className="text-sm text-ink-muted">
                    Need help? Check the <Link href="/docs/runtime/local" className="text-accent hover:underline">runtime documentation</Link> or 
                    <Link href="/docs/runtime/executors" className="text-accent hover:underline ml-1">build custom executors</Link>.
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end mt-6 gap-3">
              <button onClick={() => setStep(mode === 'hosted' ? 'select-template' : 'select-mode')} className="btn-secondary">
                Back
              </button>
              {mode === 'hosted' ? (
                <button onClick={handleDeploy} disabled={!canDeploy} className="btn-primary disabled:opacity-50">
                  <Zap className="w-4 h-4" /> Deploy
                </button>
              ) : (
                <Link href="/dashboard?tab=runtime" className="btn-primary">
                  I've Set It Up <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Deploying */}
        {step === 'deploying' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2 text-ink">Deploying Your Runtime...</h2>
            <p className="text-ink-muted">This may take a few moments</p>
          </motion.div>
        )}

        {/* Success */}
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

              <h2 className="text-2xl font-bold mb-2 text-ink">Runtime Deployed!</h2>
              <p className="text-ink-muted mb-6">
                Your service is now live and processing orders automatically.
              </p>

              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-6 text-left">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <Play className="w-5 h-5" />
                  <span className="font-semibold">Runtime Active</span>
                </div>
                <p className="text-sm text-ink-muted">
                  {selectedService?.name} is now running 24/7 and will automatically process incoming orders.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link href="/dashboard?tab=hosted" className="btn-primary w-full text-center">
                  View Dashboard
                </Link>
                <Link href="/marketplace" className="btn-secondary w-full text-center">
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
              className="fixed bottom-4 right-4 max-w-sm p-4 bg-surface-elevated border border-red-500/40 rounded-lg shadow-lg z-50"
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
