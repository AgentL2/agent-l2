'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, ChevronDown, Wallet, Settings, LogOut, Copy, 
  ExternalLink, Shield, Bell, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface WalletDropdownProps {
  isConnected: boolean;
  address: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

function truncateAddress(addr: string) {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function WalletDropdown({ isConnected, address, onConnect, onDisconnect }: WalletDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected || !address) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onConnect}
        className="btn-primary"
      >
        <Wallet className="w-4 h-4" />
        <span className="hidden sm:inline">Connect Wallet</span>
        <span className="sm:hidden">Connect</span>
      </motion.button>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-elevated border border-border hover:border-accent/50 transition-all"
      >
        {/* Agent Avatar */}
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-accent-muted border border-accent/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-accent" />
          </div>
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-surface-elevated" />
        </div>
        
        {/* Info */}
        <div className="hidden md:block text-left">
          <div className="text-sm font-semibold text-ink">Agent</div>
          <div className="text-xs text-ink-subtle font-mono">{truncateAddress(address)}</div>
        </div>
        
        <ChevronDown 
          className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-2 w-80 origin-top-right z-50"
          >
            <div className="bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden">
              {/* Agent Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-accent-muted border border-accent/30 flex items-center justify-center">
                      <Bot className="w-7 h-7 text-accent" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-surface-elevated flex items-center justify-center">
                      <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-ink">Agent</div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-accent" />
                      <span className="text-xs text-accent">Connected</span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-center gap-2 p-2 bg-surface-muted rounded-lg">
                  <code className="flex-1 text-xs text-ink-muted font-mono truncate">
                    {address}
                  </code>
                  <button
                    onClick={handleCopyAddress}
                    className="p-1.5 hover:bg-surface-elevated rounded transition-colors"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-ink-muted" />
                    )}
                  </button>
                  <a
                    href={`https://etherscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-surface-elevated rounded transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-ink-muted" />
                  </a>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-surface-muted rounded-lg p-2 text-center">
                    <div className="text-xs text-ink-subtle mb-1">Balance</div>
                    <div className="font-bold text-accent">0.00 ETH</div>
                  </div>
                  <div className="bg-surface-muted rounded-lg p-2 text-center">
                    <div className="text-xs text-ink-subtle mb-1">Earned</div>
                    <div className="font-bold text-green-400">0.00 ETH</div>
                  </div>
                  <div className="bg-surface-muted rounded-lg p-2 text-center">
                    <div className="text-xs text-ink-subtle mb-1">Reputation</div>
                    <div className="font-bold text-yellow-400">--</div>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <Link
                  href="/dashboard?tab=settings"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-all group"
                >
                  <Settings className="w-4 h-4 text-ink-muted group-hover:text-accent transition-colors" />
                  <span className="text-ink-muted group-hover:text-ink transition-colors">Settings</span>
                </Link>

                <Link
                  href="/dashboard?tab=settings#notifications"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-all group"
                >
                  <Bell className="w-4 h-4 text-ink-muted group-hover:text-accent transition-colors" />
                  <span className="text-ink-muted group-hover:text-ink transition-colors">Notifications</span>
                </Link>

                <Link
                  href="/dashboard?tab=settings#wallet"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-muted transition-all group"
                >
                  <Wallet className="w-4 h-4 text-ink-muted group-hover:text-accent transition-colors" />
                  <span className="text-ink-muted group-hover:text-ink transition-colors">Wallet Settings</span>
                </Link>

                <div className="my-2 border-t border-border" />

                <button
                  onClick={() => {
                    onDisconnect();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 transition-all group"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Disconnect</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
