'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, DollarSign, CheckCircle2, AlertCircle, Zap, Cloud, Code,
  Plus, X, ChevronRight, Loader2, Rocket, Wallet, Terminal, Settings
} from 'lucide-react';

function shortErrorMessage(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('user rejected') || m.includes('rejected') || m.includes('denied')) return 'Transaction rejected';
  if (message.length > 80 || message.includes('{') || message.includes('payload') || message.includes('eth_send')) return 'Something went wrong';
  return message.length > 80 ? message.slice(0, 77) + '…' : message;
}
import Link from 'next/link';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import DashboardNav from '@/components/dashboard/DashboardNav';
import { getAgent, ApiError } from '@/lib/api';
import {
  isWritesConfigured,
  generateDID,
  registerAgent as doRegisterAgent,
  registerService as doRegisterService,
} from '@/lib/writes';
import { EXECUTOR_TEMPLATES, type ExecutorTemplate } from '@/lib/hosted';

type ExecutionMode = 'hosted' | 'self-hosted' | 'decide-later';

const categories = [
  { id: 'text', name: 'Text & NLP', icon: '💬', serviceType: 'text-generation' },
  { id: 'code', name: 'Code & Dev', icon: '💻', serviceType: 'code-review' },
  { id: 'vision', name: 'Vision & Image', icon: '👁️', serviceType: 'image-analysis' },
  { id: 'data', name: 'Data & Analytics', icon: '📊', serviceType: 'data-extraction' },
  { id: 'audio', name: 'Audio & Speech', icon: '🎵', serviceType: 'audio-processing' },
  { id: 'other', name: 'Other', icon: '🔮', serviceType: 'custom' },
];

export default function SubmitAgentPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionMode, setExecutionMode] = useState<ExecutionMode | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ExecutorTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    icon: '🤖',
  });

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const { address, isConnecting, error: walletError, connect, getSigner } = useWallet();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [newServiceId, setNewServiceId] = useState<string | null>(null);
  const [isFirstTimeAgent, setIsFirstTimeAgent] = useState(false);

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

  const handleSubmit = useCallback(async () => {
    if (!address) {
      connect();
      return;
    }
    const signer = await getSigner();
    if (!signer) {
      setSubmitError('Could not get wallet signer. Try reconnecting.');
      return;
    }
    if (!isWritesConfigured()) {
      setSubmitError('Chain not configured. Set NEXT_PUBLIC_REGISTRY_ADDRESS and NEXT_PUBLIC_MARKETPLACE_ADDRESS.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const serviceType = categories.find(c => c.id === formData.category)?.serviceType || formData.category || 'service';
      const priceWei = ethers.parseEther((formData.price || '0').trim());
      if (priceWei === 0n) throw new Error('Price must be greater than 0');

      // Register agent if not already
      if (!isAgentRegistered) {
        const did = generateDID(address);
        await doRegisterAgent(signer, address, did, formData.description || 'ipfs://');
        setIsFirstTimeAgent(true);
      }

      // Register service
      const { serviceId, txHash } = await doRegisterService(
        signer,
        address,
        serviceType,
        priceWei,
        formData.description?.trim() || ''
      );
      setTxHash(txHash);
      setNewServiceId(serviceId);
      setStep(4);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [address, connect, getSigner, formData, isAgentRegistered]);

  useEffect(() => {
    if (!submitError) return;
    const t = setTimeout(() => setSubmitError(null), 5000);
    return () => clearTimeout(t);
  }, [submitError]);

  const icons = ['🤖', '🔮', '💻', '📊', '🎨', '🔍', '⚡', '🧠', '🎯', '🚀', '💡', '🔒'];
  const showConnectPrompt = !address && step < 4;

  // If user selects hosted and picks a template, pre-fill form
  const handleSelectTemplate = (template: ExecutorTemplate) => {
    setSelectedTemplate(template);
    const cat = categories.find(c => c.serviceType === template.serviceType) || categories[5];
    setFormData(prev => ({
      ...prev,
      name: `My ${template.name} Agent`,
      description: template.description,
      category: cat.id,
      icon: template.icon,
    }));
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <DashboardNav
        activeTab="overview"
        setActiveTab={() => {}}
        isConnected={!!address}
        address={address}
      />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {showConnectPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card border-accent/30 bg-accent/5 mb-8"
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-accent" />
              <div>
                <h3 className="font-semibold text-ink">Connect your wallet</h3>
                <p className="text-sm text-ink-muted">Your wallet becomes your agent identity on AgentL2.</p>
              </div>
              <button onClick={() => connect()} disabled={isConnecting} className="btn-primary ml-auto">
                {isConnecting ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 1: Choose Execution Mode */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold mb-4 text-ink">Create Your Agent</h1>
              <p className="text-ink-muted max-w-xl mx-auto">
                {isAgentRegistered === false 
                  ? "This will register your wallet as an agent on AgentL2 and list your first service."
                  : "List a new service for your agent on the marketplace."}
              </p>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-semibold text-ink mb-4 text-center">How will your agent run?</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Hosted Option */}
                <button
                  onClick={() => setExecutionMode('hosted')}
                  className={`card text-left transition-all ${
                    executionMode === 'hosted' ? 'border-accent bg-accent/5' : 'hover:border-border-light'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                      <Cloud className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink mb-1 flex items-center gap-2">
                        Hosted by AgentL2
                        <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">Recommended</span>
                      </h3>
                      <p className="text-sm text-ink-muted mb-3">
                        We run your agent 24/7. Just pick a template and enter your API key.
                      </p>
                      <ul className="text-xs text-ink-subtle space-y-1">
                        <li>✓ No server setup required</li>
                        <li>✓ One-click deployment</li>
                        <li>✓ Automatic order processing</li>
                        <li>✓ 5% platform fee on earnings</li>
                      </ul>
                    </div>
                  </div>
                </button>

                {/* Self-Hosted Option */}
                <button
                  onClick={() => { setExecutionMode('self-hosted'); setStep(2); }}
                  className={`card text-left transition-all ${
                    executionMode === 'self-hosted' ? 'border-accent bg-accent/5' : 'hover:border-border-light'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center shrink-0">
                      <Terminal className="w-6 h-6 text-ink-muted" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ink mb-1">Self-Hosted (Developers)</h3>
                      <p className="text-sm text-ink-muted mb-3">
                        Run the runtime yourself. Full control over execution.
                      </p>
                      <ul className="text-xs text-ink-subtle space-y-1">
                        <li>✓ Custom executors</li>
                        <li>✓ Run on your infrastructure</li>
                        <li>✓ No platform execution fee</li>
                        <li>✓ Requires technical setup</li>
                      </ul>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Hosted Templates */}
            <AnimatePresence>
              {executionMode === 'hosted' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h2 className="text-lg font-semibold text-ink mb-4">Choose a Template</h2>
                  <div className="grid md:grid-cols-2 gap-3">
                    {EXECUTOR_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="card text-left hover:border-accent/50 transition-all group p-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{template.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-ink group-hover:text-accent transition-colors">
                                {template.name}
                              </span>
                              {template.popular && (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-accent/20 text-accent">Popular</span>
                              )}
                            </div>
                            <p className="text-xs text-ink-muted line-clamp-1">{template.description}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-ink-muted group-hover:text-accent shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Step 2: Service Details */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setStep(1)} className="btn-ghost p-2">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-ink">Service Details</h1>
                <p className="text-sm text-ink-muted">
                  {executionMode === 'hosted' && selectedTemplate
                    ? `Setting up ${selectedTemplate.name}`
                    : 'Define your service offering'}
                </p>
              </div>
            </div>

            <div className="card">
              {/* Icon Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-muted mb-3">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => updateForm('icon', icon)}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                        formData.icon === icon
                          ? 'bg-accent/20 border-2 border-accent'
                          : 'bg-surface-muted border-2 border-transparent hover:border-border'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-muted mb-2">Service Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="e.g., Sentiment Analysis Pro"
                  className="input-field"
                  maxLength={50}
                />
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-muted mb-3">Category *</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateForm('category', cat.id)}
                      className={`p-3 rounded-xl text-center transition-all ${
                        formData.category === cat.id
                          ? 'bg-accent/20 border-2 border-accent'
                          : 'bg-surface-muted border-2 border-transparent hover:border-border'
                      }`}
                    >
                      <div className="text-xl mb-1">{cat.icon}</div>
                      <div className="text-xs">{cat.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-muted mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="What does your agent do? Who is it for?"
                  className="input-field"
                  rows={3}
                  maxLength={300}
                />
                <p className="text-xs text-ink-subtle mt-1">{formData.description.length}/300</p>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Price per Request (ETH) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-subtle" />
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => updateForm('price', e.target.value)}
                    placeholder="0.001"
                    className="input-field pl-12"
                    step="0.0001"
                    min="0"
                  />
                </div>
                <p className="text-xs text-ink-subtle mt-1">
                  Platform fee: 2.5% • You receive: {formData.price ? (parseFloat(formData.price) * 0.975).toFixed(6) : '0'} ETH per request
                </p>
              </div>
            </div>

            {/* Execution Mode Summary */}
            <div className={`card ${executionMode === 'hosted' ? 'bg-accent/5 border-accent/30' : 'bg-surface-muted'}`}>
              <div className="flex items-center gap-3">
                {executionMode === 'hosted' ? (
                  <>
                    <Cloud className="w-6 h-6 text-accent" />
                    <div>
                      <h4 className="font-medium text-ink">Hosted Execution</h4>
                      <p className="text-sm text-ink-muted">
                        {selectedTemplate 
                          ? `Using ${selectedTemplate.name} template. You'll configure API keys after registration.`
                          : "We'll run your agent 24/7."}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Terminal className="w-6 h-6 text-ink-muted" />
                    <div>
                      <h4 className="font-medium text-ink">Self-Hosted</h4>
                      <p className="text-sm text-ink-muted">You'll run the runtime yourself. See docs after registration.</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-ghost">← Back</button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.name || !formData.category || !formData.description || !formData.price}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                Review <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <button onClick={() => setStep(2)} className="btn-ghost p-2">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-ink">Review & Submit</h1>
                <p className="text-sm text-ink-muted">Confirm details before registering on-chain</p>
              </div>
            </div>

            {/* Preview */}
            <div className="card">
              <div className="flex items-start gap-4 mb-6">
                <span className="text-5xl">{formData.icon}</span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-ink">{formData.name}</h3>
                  <p className="text-ink-muted">{formData.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="px-2 py-1 rounded-full bg-surface-muted text-ink-subtle">
                      {categories.find(c => c.id === formData.category)?.name}
                    </span>
                    <span className="text-accent font-semibold">{formData.price} ETH / request</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Agent Address</span>
                  <span className="font-mono text-ink">{address?.slice(0, 10)}…{address?.slice(-6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Execution</span>
                  <span className="text-ink">{executionMode === 'hosted' ? 'Hosted by AgentL2' : 'Self-Hosted'}</span>
                </div>
                {executionMode === 'hosted' && selectedTemplate && (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Template</span>
                    <span className="text-ink">{selectedTemplate.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-ink-muted">Platform Fee</span>
                  <span className="text-ink">2.5%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Your Earnings</span>
                  <span className="text-green-400 font-semibold">97.5%</span>
                </div>
              </div>
            </div>

            {/* What happens next */}
            <div className="card bg-surface-muted">
              <h4 className="font-semibold text-ink mb-3">What happens when you submit:</h4>
              <ol className="space-y-2 text-sm text-ink-muted">
                {isAgentRegistered === false && (
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                    <span>Your wallet is registered as an agent on AgentL2</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs shrink-0 mt-0.5">{isAgentRegistered === false ? '2' : '1'}</span>
                  <span>Your service is listed on the marketplace</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs shrink-0 mt-0.5">{isAgentRegistered === false ? '3' : '2'}</span>
                  <span>
                    {executionMode === 'hosted'
                      ? "You'll configure your hosted runtime in the dashboard"
                      : "You'll set up the self-hosted runtime (see docs)"}
                  </span>
                </li>
              </ol>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="btn-ghost">← Back</button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !address}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    {isAgentRegistered === false ? 'Register Agent & Service' : 'Register Service'}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto text-center"
          >
            <div className="card">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </motion.div>

              <h2 className="text-2xl font-bold mb-2 text-ink">
                {isFirstTimeAgent ? 'Agent Created!' : 'Service Registered!'}
              </h2>
              <p className="text-ink-muted mb-6">
                {isFirstTimeAgent
                  ? `"${formData.name}" is now live on the AgentL2 network.`
                  : `"${formData.name}" has been added to your agent.`}
              </p>

              {txHash && (
                <div className="p-3 bg-surface-muted rounded-lg mb-6 text-left">
                  <div className="text-xs text-ink-subtle mb-1">Transaction</div>
                  <code className="text-sm text-accent break-all">{txHash.slice(0, 20)}…{txHash.slice(-8)}</code>
                </div>
              )}

              {/* Next Step CTA */}
              <div className="p-4 bg-accent/10 border border-accent/30 rounded-xl mb-6 text-left">
                <div className="flex items-start gap-3">
                  {executionMode === 'hosted' ? (
                    <>
                      <Cloud className="w-6 h-6 text-accent shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-ink mb-1">Next: Deploy Your Runtime</h4>
                        <p className="text-sm text-ink-muted">
                          Go to Dashboard → Hosted to configure API keys and start your agent.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Terminal className="w-6 h-6 text-accent shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-ink mb-1">Next: Set Up Runtime</h4>
                        <p className="text-sm text-ink-muted">
                          Go to Dashboard → Dev Runtime for setup instructions.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href={executionMode === 'hosted' ? '/dashboard?tab=hosted' : '/dashboard?tab=runtime'}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {executionMode === 'hosted' ? (
                    <>
                      <Cloud className="w-4 h-4" />
                      Configure Hosted Runtime
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4" />
                      View Runtime Setup
                    </>
                  )}
                </Link>
                <Link href="/dashboard" className="btn-secondary w-full">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error Toast */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm flex items-start gap-3 p-3 rounded-lg bg-surface-elevated border border-red-500/40 shadow-lg"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-ink flex-1">{shortErrorMessage(submitError)}</p>
            <button onClick={() => setSubmitError(null)} className="p-1 hover:bg-white/10 rounded">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
