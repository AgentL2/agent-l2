'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Upload, Code, FileText, DollarSign, Tag, Globe,
  Github, CheckCircle2, AlertCircle, Cpu, Zap, Shield, Image,
  Plus, X, ChevronRight, Loader2, Rocket, Wallet
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
import { getAgent, ApiError } from '@/lib/api';
import {
  isWritesConfigured,
  generateDID,
  registerAgent as doRegisterAgent,
  registerService as doRegisterService,
} from '@/lib/writes';
import { LabelWithTooltip, Tooltip } from '@/components/UI/Tooltip';

const categories = [
  { id: 'text', name: 'Text & NLP', icon: '💬' },
  { id: 'code', name: 'Code & Dev', icon: '💻' },
  { id: 'vision', name: 'Vision & Image', icon: '👁️' },
  { id: 'data', name: 'Data & Analytics', icon: '📊' },
  { id: 'audio', name: 'Audio & Speech', icon: '🎵' },
  { id: 'other', name: 'Other', icon: '🔮' },
];

const pricingModels = [
  { id: 'per-request', name: 'Per Request', description: 'Charge per API call' },
  { id: 'per-token', name: 'Per Token', description: 'Charge per 1K tokens processed' },
  { id: 'per-minute', name: 'Per Minute', description: 'Charge per minute of processing' },
  { id: 'flat', name: 'Flat Rate', description: 'Fixed price per job' },
];

export default function SubmitAgentPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    longDescription: '',
    category: '',
    tags: [] as string[],
    newTag: '',
    price: '',
    pricingModel: 'per-request',
    github: '',
    website: '',
    docs: '',
    contractAddress: '',
    apiEndpoint: '',
    icon: '🤖',
  });

  const updateForm = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    if (formData.newTag && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.toLowerCase()],
        newTag: ''
      }));
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const { address, isConnecting, error: walletError, connect, getSigner } = useWallet();

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
      const metadataURI = formData.longDescription?.trim() || formData.description?.trim() || '';
      const serviceType = formData.category || formData.name || 'service';
      const priceWei = ethers.parseEther((formData.price || '0').trim());
      if (priceWei === 0n) throw new Error('Price must be greater than 0');

      let agentRegistered = true;
      try {
        await getAgent(address);
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) agentRegistered = false;
        else throw e;
      }

      if (!agentRegistered) {
        const did = generateDID(address);
        await doRegisterAgent(signer, address, did, metadataURI || 'ipfs://');
        setIsFirstTimeAgent(true);
      }

      const { serviceId, txHash } = await doRegisterService(
        signer,
        address,
        serviceType,
        priceWei,
        formData.description?.trim() || metadataURI || ''
      );
      setTxHash(txHash);
      setNewServiceId(serviceId);
      setStep(4);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [address, connect, getSigner, formData.longDescription, formData.description, formData.category, formData.name, formData.price]);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [newServiceId, setNewServiceId] = useState<string | null>(null);
  const [isFirstTimeAgent, setIsFirstTimeAgent] = useState(false);

  useEffect(() => {
    if (!submitError) return;
    const t = setTimeout(() => setSubmitError(null), 5000);
    return () => clearTimeout(t);
  }, [submitError]);

  const icons = ['🤖', '🔮', '💻', '📊', '🎨', '🔍', '⚡', '🧠', '🎯', '🚀', '💡', '🔒'];

  const showConnectPrompt = !address && step < 4;

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 nav-bar border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/marketplace" className="flex items-center gap-2 text-ink-muted hover:text-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Marketplace</span>
            </Link>
            <div className="flex items-center gap-4">
              {!address ? (
                <button
                  onClick={() => connect()}
                  disabled={isConnecting}
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  <Wallet className="w-4 h-4" />
                  {isConnecting ? 'Connecting…' : 'Connect Wallet'}
                </button>
              ) : (
                <span className="text-sm text-ink-subtle font-mono">{address.slice(0, 6)}…{address.slice(-4)}</span>
              )}
              {step < 4 && (
                <span className="text-sm text-ink-subtle">Step {step} of 3</span>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
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
                <p className="text-sm text-ink-muted">You need a connected wallet to register your agent and list services on-chain.</p>
              </div>
              <button onClick={() => connect()} disabled={isConnecting} className="btn-primary ml-auto">
                {isConnecting ? 'Connecting…' : 'Connect'}
              </button>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface-muted mb-6">
            <Rocket className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-accent">Submit Your Agent</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 text-ink">
            {step === 4 ? 'Submission Complete!' : 'List Your Agent on the Marketplace'}
          </h1>
          <p className="text-ink-muted max-w-xl mx-auto">
            {step === 4 
              ? 'Your agent and service are registered on-chain.'
              : 'Share your AI agent with the network and start earning.'}
          </p>
        </motion.div>

        {/* Step indicator — modern brutalism: equal columns, square nodes, thick line */}
        {step < 4 && (
          <div className="mb-12 max-w-xl mx-auto px-4">
            {/* Thick horizontal line (runs through center of step nodes) */}
            <div className="relative h-12">
              <div className="absolute inset-x-0 top-1/2 left-0 right-0 h-1 -translate-y-1/2 bg-border" aria-hidden />
            </div>
            <div className="relative grid grid-cols-3 gap-0 -mt-12">
              {[
                { num: 1, label: 'Basic Info' },
                { num: 2, label: 'Pricing & Links' },
                { num: 3, label: 'Review' },
              ].map(({ num, label }) => {
                const isActive = step === num;
                const isDone = step > num;
                const isPending = step < num;
                return (
                  <div key={num} className="flex flex-col items-center">
                    <div
                      className={`
                        relative z-10 w-12 h-12 flex items-center justify-center font-bold text-lg border-2 transition-colors
                        ${isDone ? 'bg-accent border-accent text-surface' : ''}
                        ${isActive ? 'bg-accent border-accent text-surface' : ''}
                        ${isPending ? 'bg-surface border-border text-ink-subtle' : ''}
                      `}
                      style={{ borderRadius: 0 }}
                    >
                      {isDone ? <CheckCircle2 className="w-6 h-6" /> : num}
                    </div>
                    <span
                      className={`
                        mt-3 text-xs font-semibold uppercase tracking-wider text-center
                        ${isActive || isDone ? 'text-ink' : 'text-ink-subtle'}
                      `}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1: Basic Info */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Basic Information</h2>
              
              {/* Icon Selection */}
              <div className="mb-6">
                <LabelWithTooltip
                  label="Agent Icon"
                  tooltip="Choose an emoji that represents your agent. Shown on the marketplace and your agent card."
                />
                <div className="mb-3" />
                <div className="flex flex-wrap gap-3">
                  {icons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => updateForm('icon', icon)}
                      className={`w-14 h-14 rounded-xl text-3xl flex items-center justify-center transition-all ${
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
                <LabelWithTooltip
                  label="Agent Name *"
                  tooltip="Public name for your agent on the marketplace. Keep it clear and recognizable (e.g. SentimentAnalyzer Pro)."
                />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="e.g., SentimentAnalyzer Pro"
                  className="input-field"
                  maxLength={50}
                />
                <p className="text-xs text-ink-subtle mt-1">{formData.name.length}/50 characters</p>
              </div>

              {/* Category */}
              <div className="mb-6">
                <LabelWithTooltip
                  label="Category *"
                  tooltip="Helps buyers find your agent. Choose the best fit (e.g. Text & NLP for language models, Code & Dev for coding assistants)."
                />
                <div className="mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateForm('category', cat.id)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        formData.category === cat.id
                          ? 'bg-accent/20 border-2 border-accent'
                          : 'bg-surface-muted border-2 border-transparent hover:border-border'
                      }`}
                    >
                      <div className="text-2xl mb-2">{cat.icon}</div>
                      <div className="font-medium">{cat.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Short Description */}
              <div className="mb-6">
                <LabelWithTooltip
                  label="Short Description *"
                  tooltip="One or two sentences shown in search and listing cards. Summarize what your agent does and who it's for."
                />
                <textarea
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="A brief description of what your agent does (displayed in search results)"
                  className="input-field"
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-ink-subtle mt-1">{formData.description.length}/200 characters</p>
              </div>

              {/* Long Description */}
              <div className="mb-6">
                <LabelWithTooltip
                  label="Full Description"
                  tooltip="Detailed description for your agent's page: features, use cases, inputs/outputs. Markdown is supported. Stored as metadata reference on-chain."
                />
                <textarea
                  value={formData.longDescription}
                  onChange={(e) => updateForm('longDescription', e.target.value)}
                  placeholder="Detailed description with features, use cases, and technical specifications. Markdown supported."
                  className="input-field"
                  rows={8}
                />
              </div>

              {/* Tags */}
              <div>
                <LabelWithTooltip
                  label="Tags (up to 5)"
                  tooltip="Keywords that help discovery (e.g. nlp, api, real-time). Add a tag and press Enter or click +."
                />
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm flex items-center gap-2"
                    >
                      <span>{tag}</span>
                      <button onClick={() => removeTag(tag)} className="hover:text-ink">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.newTag}
                    onChange={(e) => updateForm('newTag', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag"
                    className="input-field flex-1"
                    maxLength={20}
                  />
                  <button onClick={addTag} className="btn-secondary px-4">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.category || !formData.description}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Pricing & Links */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Pricing & Configuration</h2>

              {/* Pricing Model */}
              <div className="mb-6">
                <LabelWithTooltip
                  label="Pricing Model *"
                  tooltip="How you charge: per request (each API call), per token (e.g. 1K tokens), per minute, or flat rate per job."
                />
                <div className="mb-3" />
                <div className="grid grid-cols-2 gap-3">
                  {pricingModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => updateForm('pricingModel', model.id)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        formData.pricingModel === model.id
                          ? 'bg-accent/20 border-2 border-accent'
                          : 'bg-surface-muted border-2 border-transparent hover:border-border'
                      }`}
                    >
                      <div className="font-medium mb-1">{model.name}</div>
                      <div className="text-xs text-ink-subtle">{model.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <LabelWithTooltip
                  label="Price (ETH) *"
                  tooltip="Price per unit in ETH. A 2.5% platform fee applies; you receive the remainder when orders complete."
                />
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
                  Platform fee: 2.5% • You receive: {formData.price ? (parseFloat(formData.price) * 0.975).toFixed(6) : '0'} ETH per {formData.pricingModel.replace('-', ' ')}
                </p>
              </div>

              {/* Agent = connected wallet; show for clarity */}
              {address && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-ink-muted mb-2">Agent (your wallet)</label>
                  <input
                    type="text"
                    value={address}
                    readOnly
                    className="input-field font-mono text-ink-subtle bg-surface-muted"
                  />
                </div>
              )}

              {/* API Endpoint */}
              <div className="mb-6">
                <LabelWithTooltip
                  label="API Endpoint"
                  tooltip="Optional. Your service URL for buyers or autonomous workers that call your API to fulfill orders."
                />
                <input
                  type="url"
                  value={formData.apiEndpoint}
                  onChange={(e) => updateForm('apiEndpoint', e.target.value)}
                  placeholder="https://api.youragent.com/v1"
                  className="input-field"
                />
              </div>
            </div>

            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Links & Resources</h2>

              {/* GitHub */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  <span className="inline-flex items-center gap-2">
                    <Github className="w-4 h-4" />
                    <span>GitHub Repository</span>
                    <Tooltip content="Link to your agent's source code. Helps builders trust and integrate." iconTrigger side="top" />
                  </span>
                </label>
                <input
                  type="url"
                  value={formData.github}
                  onChange={(e) => updateForm('github', e.target.value)}
                  placeholder="https://github.com/AgentL2/agent-l2"
                  className="input-field"
                />
              </div>

              {/* Website */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  <span className="inline-flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>Website</span>
                    <Tooltip content="Your agent's or project homepage. Optional but builds trust." iconTrigger side="top" />
                  </span>
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateForm('website', e.target.value)}
                  placeholder="https://youragent.com"
                  className="input-field"
                />
              </div>

              {/* Documentation */}
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">
                  <span className="inline-flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span>Documentation URL</span>
                    <Tooltip content="Link to API docs or usage guide. Buyers use this to integrate with your service." iconTrigger side="top" />
                  </span>
                </label>
                <input
                  type="url"
                  value={formData.docs}
                  onChange={(e) => updateForm('docs', e.target.value)}
                  placeholder="https://docs.youragent.com"
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="btn-ghost">
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.price || !address}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="card">
              <h2 className="text-2xl font-bold mb-6">Review Your Submission</h2>

              {/* Preview Card */}
              <div className="p-6 bg-surface-muted border border-border rounded-xl mb-6">
                <div className="flex items-start gap-4">
                  <div className="text-5xl">{formData.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1 text-ink">{formData.name || 'Agent Name'}</h3>
                    <p className="text-sm text-ink-muted mb-3">
                      {formData.description || 'Agent description'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-surface text-ink-subtle text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-accent">
                      {formData.price || '0'} ETH
                    </div>
                    <div className="text-xs text-ink-subtle">
                      {pricingModels.find(m => m.id === formData.pricingModel)?.name}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-ink-muted">Category</span>
                  <span className="font-medium text-ink">{categories.find(c => c.id === formData.category)?.name}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-ink-muted">Agent (wallet)</span>
                  <span className="font-mono text-sm">{address ? `${address.slice(0, 10)}…` : 'Connect wallet'}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-ink-muted">GitHub</span>
                  <span className="text-accent">{formData.github || 'Not provided'}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-border">
                  <span className="text-ink-muted">Platform Fee</span>
                  <span className="text-ink">2.5%</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-ink-muted">Your Earnings</span>
                  <span className="text-green-600 font-bold">97.5% of revenue</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="card bg-accent/5 border-accent/30">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-accent mb-2">Submission Guidelines</h4>
                  <ul className="text-sm text-ink-muted space-y-1">
                    <li>• Your agent will be reviewed within 24-48 hours</li>
                    <li>• Agents must comply with our terms of service</li>
                    <li>• You retain full ownership of your agent and code</li>
                    <li>• Earnings are distributed automatically via smart contract</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(2)} className="btn-ghost">
                ← Back
              </button>
              <button
                onClick={() => handleSubmit()}
                disabled={isSubmitting || !address}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    <span>Submit Agent</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="card max-w-lg mx-auto">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isFirstTimeAgent ? 'bg-green-500/20' : 'bg-green-500/20'}`}
              >
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </motion.div>

              {isFirstTimeAgent ? (
                <>
                  <motion.span
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="inline-block px-3 py-1 bg-green-500/20 text-green-500 text-sm font-semibold rounded-full border border-green-500/30 mb-4"
                  >
                    Live on network
                  </motion.span>
                  <h2 className="text-2xl font-bold mb-3 text-ink">Your agent is live</h2>
                  <p className="text-ink-muted mb-4">
                    Your agent is now on the network. It can receive orders and earn. Add more services anytime from the dashboard.
                  </p>
                  <p className="text-ink-subtle text-sm mb-6">
                    &quot;{formData.name}&quot; and your first service are registered on-chain.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-3 text-ink">Agent & Service Registered</h2>
                  <p className="text-ink-muted mb-6">
                    &quot;{formData.name}&quot; is now registered on-chain. Your service is live on the marketplace.
                  </p>
                </>
              )}

              {txHash && (
                <div className="p-4 bg-surface-muted border border-border rounded-lg mb-4 text-left">
                  <div className="text-sm text-ink-subtle mb-1">Transaction</div>
                  <a href="#" className="font-mono text-accent text-sm break-all" onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(txHash); }}>
                    {txHash.slice(0, 18)}…{txHash.slice(-8)}
                  </a>
                </div>
              )}
              {newServiceId && (
                <div className="p-4 bg-surface-muted border border-border rounded-lg mb-6 text-left">
                  <div className="text-sm text-ink-subtle mb-1">Service ID</div>
                  <div className="font-mono text-accent text-sm break-all">{newServiceId}</div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/marketplace" className="btn-secondary flex-1 flex items-center justify-center gap-2">
                  <span>View on Marketplace</span>
                </Link>
                <Link href={isFirstTimeAgent ? '/dashboard?new=1' : '/dashboard'} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <span>Go to Dashboard</span>
                </Link>
                {isFirstTimeAgent && (
                  <Link href="/marketplace/submit" className="btn-ghost flex-1 flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Add another service</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error toast — bottom right, minimal message */}
      <AnimatePresence>
        {submitError && (
          <motion.div
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm flex items-start gap-3 p-3 rounded-lg bg-surface-elevated border border-red-500/40 shadow-lg"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-ink flex-1 min-w-0">
              {shortErrorMessage(submitError)}
            </p>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="shrink-0 p-1 rounded hover:bg-white/10 text-ink-muted hover:text-ink transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
