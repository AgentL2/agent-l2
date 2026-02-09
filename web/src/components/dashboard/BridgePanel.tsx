'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowDown, Zap, ChevronDown, Wallet, ExternalLink, 
  AlertCircle, Loader2, CheckCircle, Clock
} from 'lucide-react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';

interface Chain {
  id: string;
  name: string;
  icon: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
}

const chains: Chain[] = [
  {
    id: 'ethereum',
    name: 'Ethereum',
    icon: '⟠',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerUrl: 'https://etherscan.io',
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    icon: '🔵',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
  },
  {
    id: 'optimism',
    name: 'Optimism',
    icon: '🔴',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
  },
  {
    id: 'base',
    name: 'Base',
    icon: '🔷',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
  },
];

type BridgeStatus = 'idle' | 'approving' | 'bridging' | 'confirming' | 'success' | 'error';

interface BridgePanelProps {
  address: string;
}

export default function BridgePanel({ address }: BridgePanelProps) {
  const { getSigner } = useWallet();
  
  const [fromChain, setFromChain] = useState(chains[0]);
  const [amount, setAmount] = useState('');
  const [showChainSelect, setShowChainSelect] = useState(false);
  
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  
  const [status, setStatus] = useState<BridgeStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Fetch balance when address or chain changes
  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    
    const fetchBalance = async () => {
      setBalanceLoading(true);
      try {
        const provider = new ethers.JsonRpcProvider(fromChain.rpcUrl);
        const bal = await provider.getBalance(address);
        setBalance(ethers.formatEther(bal));
      } catch (e) {
        console.error('Failed to fetch balance:', e);
        setBalance(null);
      } finally {
        setBalanceLoading(false);
      }
    };
    
    fetchBalance();
  }, [address, fromChain]);

  // Calculate fee (0.1%)
  const fee = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount))) return '0';
    return (parseFloat(amount) * 0.001).toFixed(6);
  }, [amount]);

  // Calculate receive amount
  const receiveAmount = useMemo(() => {
    if (!amount || isNaN(parseFloat(amount))) return '0';
    return (parseFloat(amount) * 0.999).toFixed(6);
  }, [amount]);

  // Handle bridge
  const handleBridge = async () => {
    if (!address || !amount) return;
    
    setStatus('bridging');
    setError(null);
    setTxHash(null);

    try {
      const signer = await getSigner();
      if (!signer) throw new Error('Failed to get signer');

      // Simulate for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatus('confirming');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setTxHash('0x' + Math.random().toString(16).slice(2, 66));
      setStatus('success');
      setAmount('');
    } catch (e: any) {
      console.error('Bridge error:', e);
      setError(e.message || 'Bridge failed');
      setStatus('error');
    }
  };

  const setMaxAmount = () => {
    if (balance) {
      const max = Math.max(0, parseFloat(balance) - 0.01);
      setAmount(max.toFixed(6));
    }
  };

  const isValidAmount = amount && parseFloat(amount) > 0 && (!balance || parseFloat(amount) <= parseFloat(balance));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-ink">Bridge</h2>
        <p className="text-ink-muted">Transfer assets to AgentL2 instantly</p>
      </div>

      {/* Bridge Card */}
      <div className="max-w-lg">
        <div className="card">
          {/* From Section */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-ink-muted">From</label>
              {balance && (
                <span className="text-xs text-ink-subtle">
                  Balance: {parseFloat(balance).toFixed(4)} ETH
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              {/* Chain Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowChainSelect(!showChainSelect)}
                  className="flex items-center gap-2 px-3 py-3 bg-surface border border-border rounded-xl hover:border-ink-subtle transition-colors"
                >
                  <span className="text-xl">{fromChain.icon}</span>
                  <span className="font-medium text-sm">{fromChain.name}</span>
                  <ChevronDown className="w-4 h-4 text-ink-subtle" />
                </button>
                
                {showChainSelect && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowChainSelect(false)} />
                    <div className="absolute top-full left-0 mt-2 w-48 bg-surface-elevated border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                      {chains.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() => {
                            setFromChain(chain);
                            setShowChainSelect(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-muted transition-colors text-left ${
                            chain.id === fromChain.id ? 'bg-surface-muted' : ''
                          }`}
                        >
                          <span className="text-lg">{chain.icon}</span>
                          <span className="text-sm">{chain.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Amount Input */}
              <div className="flex-1 relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  disabled={status === 'bridging' || status === 'confirming'}
                  className="w-full px-4 py-3 bg-surface border border-border rounded-xl text-lg font-medium focus:border-accent focus:outline-none transition-colors disabled:opacity-50 overflow-hidden [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button 
                    onClick={setMaxAmount}
                    disabled={!balance}
                    className="px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 rounded transition-colors disabled:opacity-50"
                  >
                    MAX
                  </button>
                  <span className="text-sm text-ink-muted">ETH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center my-4">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center">
              <ArrowDown className="w-5 h-5 text-ink-muted" />
            </div>
          </div>

          {/* To Section */}
          <div className="mb-6">
            <label className="text-sm text-ink-muted mb-2 block">To</label>
            <div className="flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                  L2
                </div>
                <span className="font-medium">AgentL2</span>
              </div>
              <span className="text-lg font-medium">{receiveAmount} ETH</span>
            </div>
          </div>

          {/* Transaction Details */}
          {amount && parseFloat(amount) > 0 && (
            <div className="p-4 bg-surface rounded-xl mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-muted">Bridge Fee (0.1%)</span>
                <span>{fee} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">Estimated Time</span>
                <span className="flex items-center gap-1 text-green-400">
                  <Zap className="w-3 h-3" /> ~30 seconds
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-muted">You Receive</span>
                <span className="font-medium text-accent">{receiveAmount} ETH</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && txHash && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl mb-6">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Bridge Successful</span>
              </div>
              <p className="text-sm text-ink-muted mb-2">
                Your funds will arrive on AgentL2 shortly.
              </p>
              <a
                href={`${fromChain.explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline flex items-center gap-1"
              >
                View Transaction <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Bridge Button */}
          {status === 'bridging' || status === 'confirming' ? (
            <button
              disabled
              className="w-full py-4 bg-surface text-ink-muted font-medium rounded-xl flex items-center justify-center gap-2"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              {status === 'bridging' ? 'Bridging...' : 'Confirming...'}
            </button>
          ) : (
            <button
              onClick={handleBridge}
              disabled={!isValidAmount}
              className="w-full py-4 bg-accent text-white font-medium rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!amount ? 'Enter Amount' : !isValidAmount ? 'Insufficient Balance' : 'Bridge'}
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-surface-elevated rounded-xl border border-border">
          <h3 className="font-medium text-ink mb-2">How it works</h3>
          <ul className="text-sm text-ink-muted space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-accent">1.</span>
              Select source chain and enter amount
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">2.</span>
              Confirm transaction in your wallet
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">3.</span>
              Funds arrive on AgentL2 in ~30 seconds
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
