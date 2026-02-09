'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, Check, Loader2, Zap, Bot,
  DollarSign, AlertTriangle, CheckCircle2, Package
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import DashboardNav from '@/components/dashboard/DashboardNav';
import { isWritesConfigured, registerService as doRegisterService } from '@/lib/writes';

type Step = 'agent' | 'details' | 'pricing' | 'review' | 'success';

const SERVICE_TYPES = [
  { id: 'text-generation', name: 'Text Generation', icon: '✍️', description: 'Generate text, articles, summaries' },
  { id: 'code-review', name: 'Code Review', icon: '💻', description: 'Review code, find bugs, suggest improvements' },
  { id: 'data-analysis', name: 'Data Analysis', icon: '📊', description: 'Analyze data, extract insights' },
  { id: 'translation', name: 'Translation', icon: '🌐', description: 'Translate between languages' },
  { id: 'sentiment-analysis', name: 'Sentiment Analysis', icon: '😊', description: 'Analyze sentiment and emotions' },
  { id: 'image-analysis', name: 'Image Analysis', icon: '🖼️', description: 'Analyze and describe images' },
  { id: 'custom', name: 'Custom Service', icon: '🔧', description: 'Define your own service type' },
];

interface ServiceConfig {
  agentId: string;
  agentName: string;
  serviceType: string;
  customType: string;
  description: string;
  pricePerUnit: string;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  status: string;
  model: string;
}

export default function CreateServicePage() {
  const router = useRouter();
  const { address, connect, isConnecting, getSigner } = useWallet();
  
  const [step, setStep] = useState<Step>('agent');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  
  const [config, setConfig] = useState<ServiceConfig>({
    agentId: '',
    agentName: '',
    serviceType: '',
    customType: '',
    description: '',
    pricePerUnit: '0.001',
  });

  // Fetch user's agents
  useEffect(() => {
    if (!address) {
      setAgents([]);
      setLoadingAgents(false);
      return;
    }

    setLoadingAgents(true);
    fetch(`/api/runtime/agents?owner=${encodeURIComponent(address)}`)
      .then((res) => res.json())
      .then((data) => {
        setAgents(data.agents || []);
      })
      .catch((err) => {
        console.error('Failed to fetch agents:', err);
        setAgents([]);
      })
      .finally(() => setLoadingAgents(false));
  }, [address]);

  const updateConfig = (updates: Partial<ServiceConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const selectAgent = (agent: Agent) => {
    updateConfig({ agentId: agent.id, agentName: agent.name });
    setStep('details');
  };

  const handleCreate = async () => {
    if (!address) return;
    
    const signer = await getSigner();
    if (!signer) {
      setError('Could not get wallet signer');
      return;
    }

    if (!isWritesConfigured()) {
      setError('Chain not configured. Contracts not deployed.');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const serviceType = config.serviceType === 'custom' ? config.customType : config.serviceType;
      const priceWei = ethers.parseEther(config.pricePerUnit);

      const result = await doRegisterService(
        signer,
        address,
        serviceType,
        priceWei,
        config.description
      );

      setTxHash(result.txHash);
      setServiceId(result.serviceId);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create service');
    } finally {
      setCreating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'agent':
        return config.agentId !== '';
      case 'details':
        return config.serviceType !== '' && (config.serviceType !== 'custom' || config.customType.trim() !== '');
      case 'pricing':
        return parseFloat(config.pricePerUnit) > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['agent', 'details', 'pricing', 'review'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const prevStep = () => {
    const steps: Step[] = ['agent', 'details', 'pricing', 'review'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const stepNumber = ['agent', 'details', 'pricing', 'review', 'success'].indexOf(step) + 1;

  return (
    <div className="min-h-screen bg-surface text-ink">
      <DashboardNav
        activeTab="services"
        setActiveTab={() => {}}
        isConnected={!!address}
        address={address}
      />

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Back Link */}
        <Link
          href="/dashboard?tab=services"
          className="inline-flex items-center gap-2 text-ink-muted hover:text-accent transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Services
        </Link>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink mb-2">Create Service</h1>
          <p className="text-ink-muted">
            Create a service listing and assign it to one of your agents
          </p>
        </div>

        {/* Progress Steps */}
        {step !== 'success' && (
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {['Agent', 'Details', 'Pricing', 'Review'].map((label, idx) => (
              <div key={label} className="flex items-center">
                {idx > 0 && <div className="w-8 h-px bg-border mx-1" />}
                <StepIndicator num={idx + 1} current={stepNumber} label={label} />
              </div>
            ))}
          </div>
        )}

        {/* Connect Wallet */}
        {!address && (
          <div className="card border-accent/30 bg-accent/5 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-ink">Connect your wallet</h3>
                <p className="text-sm text-ink-muted">Required to create a service</p>
              </div>
              <button onClick={() => connect()} disabled={isConnecting} className="btn-primary">
                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {step === 'agent' && (
            <AgentStep
              agents={agents}
              loading={loadingAgents}
              selectedId={config.agentId}
              onSelect={selectAgent}
              address={address}
            />
          )}
          {step === 'details' && (
            <DetailsStep config={config} updateConfig={updateConfig} />
          )}
          {step === 'pricing' && (
            <PricingStep config={config} updateConfig={updateConfig} />
          )}
          {step === 'review' && (
            <ReviewStep config={config} />
          )}
          {step === 'success' && (
            <SuccessStep 
              serviceId={serviceId} 
              txHash={txHash} 
              agentName={config.agentName}
              serviceType={config.serviceType === 'custom' ? config.customType : config.serviceType}
            />
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
        {step !== 'success' && step !== 'agent' && (
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <button onClick={prevStep} className="btn-ghost" disabled={creating}>
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <Link href="/dashboard?tab=services" className="btn-ghost">
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
                      <Zap className="w-4 h-4" />
                      Create Service
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
// Components
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

function AgentStep({
  agents,
  loading,
  selectedId,
  onSelect,
  address,
}: {
  agents: Agent[];
  loading: boolean;
  selectedId: string;
  onSelect: (agent: Agent) => void;
  address: string | null;
}) {
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
            <h3 className="text-lg font-semibold text-ink">Select Agent</h3>
            <p className="text-sm text-ink-muted">Which agent will handle this service?</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
            <p className="text-ink-muted">Loading your agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="py-12 text-center">
            <Bot className="w-12 h-12 text-ink-subtle mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-ink mb-2">No Agents Yet</h4>
            <p className="text-ink-muted mb-6">Create an agent first before adding a service</p>
            <Link href="/dashboard/create-agent" className="btn-primary">
              <Zap className="w-4 h-4" />
              Create Agent
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelect(agent)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  selectedId === agent.id
                    ? 'border-accent bg-accent/5'
                    : 'border-border hover:border-border-light'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-ink">{agent.name}</h4>
                    <p className="text-sm text-ink-muted">{agent.description || 'No description'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-accent">{agent.model}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        agent.status === 'active' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-surface-muted text-ink-muted'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-muted" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DetailsStep({ config, updateConfig }: { config: ServiceConfig; updateConfig: (u: Partial<ServiceConfig>) => void }) {
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
            <Package className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">Service Details</h3>
            <p className="text-sm text-ink-muted">What service will {config.agentName} provide?</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-3">
              Service Type <span className="text-red-400">*</span>
            </label>
            <div className="grid md:grid-cols-2 gap-3">
              {SERVICE_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => updateConfig({ serviceType: type.id })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.serviceType === type.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border hover:border-border-light'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{type.icon}</span>
                    <div>
                      <div className="font-medium text-ink text-sm">{type.name}</div>
                      <div className="text-xs text-ink-muted">{type.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {config.serviceType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Custom Service Type <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={config.customType}
                onChange={(e) => updateConfig({ customType: e.target.value })}
                className="input-field"
                placeholder="e.g., legal-document-review"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Description
            </label>
            <textarea
              value={config.description}
              onChange={(e) => updateConfig({ description: e.target.value })}
              className="input-field min-h-[100px] resize-y"
              placeholder="Describe what this service does..."
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PricingStep({ config, updateConfig }: { config: ServiceConfig; updateConfig: (u: Partial<ServiceConfig>) => void }) {
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
            <DollarSign className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">Pricing</h3>
            <p className="text-sm text-ink-muted">Set the price per request</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            Price per Unit (ETH) <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              value={config.pricePerUnit}
              onChange={(e) => updateConfig({ pricePerUnit: e.target.value })}
              className="input-field pr-16"
              placeholder="0.001"
              step="0.0001"
              min="0"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted">ETH</span>
          </div>
          <p className="text-xs text-ink-subtle mt-2">
            This is the amount buyers pay per request. You'll receive this minus protocol fees (2.5%).
          </p>
        </div>

        {/* Price suggestions */}
        <div className="mt-4">
          <p className="text-sm text-ink-muted mb-2">Quick set:</p>
          <div className="flex flex-wrap gap-2">
            {['0.0001', '0.0005', '0.001', '0.005', '0.01'].map((price) => (
              <button
                key={price}
                onClick={() => updateConfig({ pricePerUnit: price })}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  config.pricePerUnit === price
                    ? 'bg-accent text-white'
                    : 'bg-surface-muted text-ink-muted hover:text-ink'
                }`}
              >
                {price} ETH
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ReviewStep({ config }: { config: ServiceConfig }) {
  const serviceType = SERVICE_TYPES.find((t) => t.id === config.serviceType);
  const displayType = config.serviceType === 'custom' ? config.customType : serviceType?.name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="card bg-accent/5 border-accent/30">
        <h3 className="text-xl font-bold text-ink mb-4">Service Summary</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-ink-muted">Assigned Agent</span>
            <span className="text-ink font-medium">{config.agentName}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-ink-muted">Service Type</span>
            <span className="text-ink font-medium">{displayType}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-ink-muted">Price per Request</span>
            <span className="text-accent font-bold">{config.pricePerUnit} ETH</span>
          </div>
          {config.description && (
            <div className="py-2">
              <span className="text-ink-muted block mb-2">Description</span>
              <p className="text-ink text-sm">{config.description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="card bg-surface-muted border-dashed">
        <p className="text-sm text-ink-muted">
          <strong>What happens next:</strong> A service will be registered on-chain. When buyers 
          purchase this service, orders will be created and your agent ({config.agentName}) will 
          automatically process them.
        </p>
      </div>
    </motion.div>
  );
}

function SuccessStep({
  serviceId,
  txHash,
  agentName,
  serviceType,
}: {
  serviceId: string | null;
  txHash: string | null;
  agentName: string;
  serviceType: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
        <CheckCircle2 className="w-10 h-10 text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-ink mb-2">Service Created!</h2>
      <p className="text-ink-muted mb-4 max-w-md mx-auto">
        Your <strong>{serviceType}</strong> service is now live. <strong>{agentName}</strong> will 
        handle all incoming requests.
      </p>
      {serviceId && (
        <p className="text-sm text-ink-subtle mb-2">
          Service ID: <code className="bg-surface-muted px-2 py-1 rounded text-xs">{serviceId.slice(0, 18)}...</code>
        </p>
      )}
      {txHash && (
        <p className="text-sm text-ink-subtle mb-8">
          Transaction: <code className="bg-surface-muted px-2 py-1 rounded text-xs">{txHash.slice(0, 18)}...</code>
        </p>
      )}
      <div className="flex items-center justify-center gap-4">
        <Link href="/dashboard?tab=services" className="btn-primary">
          <Package className="w-4 h-4" />
          View Services
        </Link>
        <Link href="/marketplace" className="btn-secondary">
          Go to Marketplace
        </Link>
      </div>
    </motion.div>
  );
}
