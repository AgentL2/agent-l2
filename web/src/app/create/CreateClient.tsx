'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, DollarSign, CheckCircle2, AlertCircle, Zap, Cloud, Terminal,
  Plus, X, ChevronRight, ChevronLeft, Loader2, Rocket, Wallet, Bot, Layers,
  Settings, Play, Package
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { getAgent, ApiError } from '@/lib/api';
import {
  isWritesConfigured,
  generateDID,
  registerAgent as doRegisterAgent,
  registerService as doRegisterService,
} from '@/lib/writes';

type CreateType = 'choose' | 'agent' | 'service';
type Step = 'details' | 'confirm' | 'processing' | 'success';

const categories = [
  { id: 'text', name: 'Text & NLP', icon: '💬', serviceType: 'text-generation' },
  { id: 'code', name: 'Code & Dev', icon: '💻', serviceType: 'code-review' },
  { id: 'vision', name: 'Vision', icon: '👁️', serviceType: 'image-analysis' },
  { id: 'data', name: 'Data', icon: '📊', serviceType: 'data-extraction' },
  { id: 'automation', name: 'Automation', icon: '⚡', serviceType: 'automation' },
  { id: 'other', name: 'Other', icon: '🔮', serviceType: 'custom' },
];

export default function CreateClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnecting, connect, getSigner } = useWallet();
  
  const typeParam = searchParams?.get('type');
  const [createType, setCreateType] = useState<CreateType>(
    typeParam === 'agent' ? 'agent' : typeParam === 'service' ? 'service' : 'choose'
  );
  const [step, setStep] = useState<Step>('details');
  
  const [error, setError] = useState<string | null>(null);
  
  const [agentForm, setAgentForm] = useState({
    name: '',
    description: '',
    icon: '🤖',
  });
  
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    category: '',
    price: '0.001',
    icon: '⚡',
  });
  
  const [txHash, setTxHash] = useState<string | null>(null);
  const [createdDID, setCreatedDID] = useState<string | null>(null);
  const [createdServiceId, setCreatedServiceId] = useState<string | null>(null);

  const [isAgentRegistered, setIsAgentRegistered] = useState<boolean | null>(null);
  const [existingServices, setExistingServices] = useState<any[]>([]);
  
  useEffect(() => {
    if (!address) {
      setIsAgentRegistered(null);
      setExistingServices([]);
      return;
    }
    getAgent(address)
      .then((data) => {
        setIsAgentRegistered(true);
        setExistingServices(data.services || []);
      })
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) {
          setIsAgentRegistered(false);
          setExistingServices([]);
        }
      });
  }, [address]);

  useEffect(() => {
    if (createType === 'service' && isAgentRegistered === false) {
      setCreateType('agent');
      setError('You need to create an agent first before adding services.');
    }
  }, [createType, isAgentRegistered]);

  const handleCreateAgent = useCallback(async () => {
    if (!address) { connect(); return; }
    
    const signer = await getSigner();
    if (!signer) {
      setError('Could not get wallet signer. Try reconnecting.');
      return;
    }
    
    if (!isWritesConfigured()) {
      setError('Chain not configured. Check environment variables.');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const did = generateDID(address);
      const metadata = JSON.stringify({
        name: agentForm.name,
        description: agentForm.description,
        icon: agentForm.icon,
      });
      
      const result = await doRegisterAgent(signer, address, did, metadata);
      setTxHash(result.txHash);
      setCreatedDID(did);
      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create agent');
      setStep('confirm');
    }
  }, [address, connect, getSigner, agentForm]);

  const handleCreateService = useCallback(async () => {
    if (!address) { connect(); return; }
    
    const signer = await getSigner();
    if (!signer) {
      setError('Could not get wallet signer. Try reconnecting.');
      return;
    }
    
    if (!isWritesConfigured()) {
      setError('Chain not configured. Check environment variables.');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const serviceType = categories.find(c => c.id === serviceForm.category)?.serviceType || 'custom';
      const priceWei = ethers.parseEther(serviceForm.price.trim() || '0.001');
      const metadata = JSON.stringify({
        name: serviceForm.name,
        description: serviceForm.description,
        icon: serviceForm.icon,
      });

      const { serviceId, txHash } = await doRegisterService(
        signer,
        address,
        serviceType,
        priceWei,
        metadata
      );
      
      setTxHash(txHash);
      setCreatedServiceId(serviceId);
      setStep('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create service');
      setStep('confirm');
    }
  }, [address, connect, getSigner, serviceForm]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  const canCreateAgent = agentForm.name.trim().length > 0;
  const canCreateService = serviceForm.name.trim().length > 0 && serviceForm.category && serviceForm.price;

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Nav */}
      <nav className="sticky top-0 z-50 nav-bar border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href={createType === 'choose' ? '/' : '/create'} className="flex items-center gap-2 text-ink-muted hover:text-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>{createType === 'choose' ? 'Home' : 'Back'}</span>
            </Link>
            {!address ? (
              <button onClick={() => connect()} disabled={isConnecting} className="btn-primary text-sm">
                <Wallet className="w-4 h-4" />
                {isConnecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {isAgentRegistered === false && (
                  <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">No Agent</span>
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
        {/* Connect Wallet */}
        {!address && (
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

        {/* Choose What to Create */}
        {createType === 'choose' && step !== 'success' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold mb-3 text-ink">What do you want to create?</h1>
              <p className="text-ink-muted">Agents are your identity. Services are what they offer.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Create Agent */}
              <button
                onClick={() => { setCreateType('agent'); setStep('details'); }}
                disabled={isAgentRegistered === true}
                className={`card text-left transition-all group ${isAgentRegistered === true ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent/50'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shrink-0">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-ink group-hover:text-accent">Create Agent</h3>
                      {isAgentRegistered === true && (
                        <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400">Already Created</span>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted mb-3">Register your wallet as an autonomous agent.</p>
                    <ul className="text-xs text-ink-subtle space-y-1">
                      <li>• One agent per wallet</li>
                      <li>• Gets a DID</li>
                      <li>• Can offer multiple services</li>
                    </ul>
                  </div>
                </div>
              </button>

              {/* Create Service */}
              <button
                onClick={() => { 
                  if (isAgentRegistered === false) {
                    setError('Create an agent first before adding services.');
                    return;
                  }
                  setCreateType('service'); 
                  setStep('details'); 
                }}
                disabled={isAgentRegistered === false}
                className={`card text-left transition-all group ${isAgentRegistered === false ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent/50'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0">
                    <Layers className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-ink group-hover:text-accent">Create Service</h3>
                      {existingServices.length > 0 && (
                        <span className="px-2 py-0.5 text-xs rounded bg-accent/20 text-accent">{existingServices.length} active</span>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted mb-3">Add a new service to your agent.</p>
                    <ul className="text-xs text-ink-subtle space-y-1">
                      <li>• Listed on marketplace</li>
                      <li>• Set your price</li>
                      <li>• Deploy to earn</li>
                    </ul>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-8 p-4 bg-surface-muted rounded-xl">
              <h4 className="font-medium text-ink mb-2">How it works</h4>
              <div className="flex items-center gap-4 text-sm text-ink-muted flex-wrap">
                <span>1. Create Agent</span>
                <ChevronRight className="w-4 h-4 text-ink-subtle" />
                <span>2. Add Services</span>
                <ChevronRight className="w-4 h-4 text-ink-subtle" />
                <span>3. Deploy Runtime</span>
                <ChevronRight className="w-4 h-4 text-ink-subtle" />
                <span className="text-green-400">Earn</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Create Agent Details */}
        {createType === 'agent' && step === 'details' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setCreateType('choose')} className="btn-ghost mb-6">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2 text-ink">Create Your Agent</h1>
            </div>

            <div className="card space-y-6">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {['🤖', '🔮', '🧠', '⚡', '🎯', '🚀', '💎', '🦾', '👾', '🌟'].map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setAgentForm({ ...agentForm, icon })}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center ${agentForm.icon === icon ? 'bg-accent/20 border-2 border-accent' : 'bg-surface-muted'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Name *</label>
                <input
                  type="text"
                  value={agentForm.name}
                  onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                  className="input-field"
                  placeholder="My AI Agent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Description</label>
                <textarea
                  value={agentForm.description}
                  onChange={(e) => setAgentForm({ ...agentForm, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="What does your agent do?"
                />
              </div>
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button onClick={() => setCreateType('choose')} className="btn-secondary">Cancel</button>
              <button onClick={() => setStep('confirm')} disabled={!canCreateAgent} className="btn-primary disabled:opacity-50">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Create Agent Confirm */}
        {createType === 'agent' && step === 'confirm' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setStep('details')} className="btn-ghost mb-6">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-2xl font-bold mb-6 text-ink">Confirm Agent Creation</h2>

            <div className="card mb-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl">{agentForm.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-ink">{agentForm.name}</h3>
                  <p className="text-ink-muted">{agentForm.description || 'No description'}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setStep('details')} className="btn-secondary">Back</button>
              <button onClick={handleCreateAgent} disabled={!address} className="btn-primary">
                <Rocket className="w-4 h-4" /> Create Agent
              </button>
            </div>
          </motion.div>
        )}

        {/* Create Service Details */}
        {createType === 'service' && step === 'details' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setCreateType('choose')} className="btn-ghost mb-6">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold mb-2 text-ink">Create a Service</h1>
            </div>

            <div className="card space-y-6">
              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {['⚡', '💬', '💻', '📊', '🎨', '🔍', '🧠', '📝', '🔧', '🎯'].map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setServiceForm({ ...serviceForm, icon })}
                      className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center ${serviceForm.icon === icon ? 'bg-accent/20 border-2 border-accent' : 'bg-surface-muted'}`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Name *</label>
                <input
                  type="text"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Code Review, Text Summarization"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Category *</label>
                <div className="grid grid-cols-3 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setServiceForm({ ...serviceForm, category: cat.id })}
                      className={`p-3 rounded-xl text-sm flex flex-col items-center gap-1 ${serviceForm.category === cat.id ? 'bg-accent text-white' : 'bg-surface-muted text-ink-muted hover:bg-surface-elevated'}`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Description</label>
                <textarea
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="What does this service do?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-muted mb-2">Price (ETH) *</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" />
                  <input
                    type="number"
                    value={serviceForm.price}
                    onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                    className="input-field pl-10"
                    placeholder="0.001"
                    step="0.0001"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 gap-3">
              <button onClick={() => setCreateType('choose')} className="btn-secondary">Cancel</button>
              <button onClick={() => setStep('confirm')} disabled={!canCreateService} className="btn-primary disabled:opacity-50">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Create Service Confirm */}
        {createType === 'service' && step === 'confirm' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setStep('details')} className="btn-ghost mb-6">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <h2 className="text-2xl font-bold mb-6 text-ink">Confirm Service</h2>

            <div className="card mb-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-5xl">{serviceForm.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-ink">{serviceForm.name}</h3>
                  <p className="text-ink-muted">{serviceForm.description || 'No description'}</p>
                </div>
              </div>
              <div className="border-t border-border pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Category</span>
                  <span>{categories.find(c => c.id === serviceForm.category)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-muted">Price</span>
                  <span className="text-accent font-bold">{serviceForm.price} ETH</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl mb-6">
              <p className="text-sm text-ink-muted">
                <strong className="text-yellow-400">Next step:</strong> Deploy a runtime to start processing orders.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setStep('details')} className="btn-secondary">Back</button>
              <button onClick={handleCreateService} disabled={!address} className="btn-primary">
                <Rocket className="w-4 h-4" /> Create Service
              </button>
            </div>
          </motion.div>
        )}

        {/* Processing */}
        {step === 'processing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2 text-ink">
              {createType === 'agent' ? 'Creating Agent...' : 'Creating Service...'}
            </h2>
            <p className="text-ink-muted">Confirm in your wallet</p>
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

              <h2 className="text-2xl font-bold mb-2 text-ink">
                {createType === 'agent' ? 'Agent Created!' : 'Service Created!'}
              </h2>
              <p className="text-ink-muted mb-6">
                {createType === 'agent' ? 'Add services to start earning!' : 'Deploy a runtime to process orders.'}
              </p>

              {txHash && (
                <div className="p-3 bg-surface-muted rounded-lg mb-6 text-left">
                  <div className="text-xs text-ink-subtle mb-1">Transaction</div>
                  <code className="text-xs text-accent break-all">{txHash}</code>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {createType === 'agent' ? (
                  <>
                    <button onClick={() => { setCreateType('service'); setStep('details'); }} className="btn-primary w-full">
                      <Plus className="w-4 h-4" /> Add First Service
                    </button>
                    <Link href="/dashboard" className="btn-secondary w-full text-center">Dashboard</Link>
                  </>
                ) : (
                  <>
                    <Link href="/deploy" className="btn-primary w-full text-center">
                      <Play className="w-4 h-4" /> Deploy Runtime
                    </Link>
                    <button onClick={() => { setStep('details'); setServiceForm({ ...serviceForm, name: '', description: '' }); }} className="btn-secondary w-full">
                      <Plus className="w-4 h-4" /> Add Another Service
                    </button>
                    <Link href="/dashboard" className="btn-ghost w-full text-center">Dashboard</Link>
                  </>
                )}
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
                <p className="text-sm text-ink flex-1">{error}</p>
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
