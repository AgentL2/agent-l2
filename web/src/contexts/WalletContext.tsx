'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ethers, type Signer } from 'ethers';

export interface WalletContextValue {
  address: string | null;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Returns a signer for the connected account; null if not connected or no provider. */
  getSigner: () => Promise<Signer | null>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const win = typeof window !== 'undefined' ? (window as unknown as { ethereum?: ethers.Eip1193Provider }) : undefined;
      const provider = win?.ethereum;
      if (!provider) {
        setError('No wallet found. Install MetaMask or another Web3 wallet.');
        return;
      }
      const web3 = new ethers.BrowserProvider(provider);
      const accounts = await web3.send('eth_requestAccounts', []);
      if (accounts?.length) {
        setAddress(ethers.getAddress(accounts[0]));
      }
      // Verify chain — switch to the correct network if needed
      const expectedChainId = process.env.NEXT_PUBLIC_CHAIN_ID || '10143'; // Monad testnet
      try {
        const network = await web3.getNetwork();
        if (network.chainId.toString() !== expectedChainId) {
          try {
            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x' + parseInt(expectedChainId).toString(16) }],
            });
          } catch (switchErr: any) {
            // Chain not added — try to add it
            if (switchErr?.code === 4902) {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0x' + parseInt(expectedChainId).toString(16),
                  chainName: 'Monad Testnet',
                  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
                  rpcUrls: ['https://testnet-rpc.monad.xyz'],
                  blockExplorerUrls: ['https://testnet.monadexplorer.com'],
                }],
              });
            } else {
              console.warn('Could not switch chain:', switchErr);
            }
          }
        }
      } catch (chainErr) {
        console.warn('Chain verification failed:', chainErr);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  const getSigner = useCallback(async (): Promise<Signer | null> => {
    const win = typeof window !== 'undefined' ? (window as unknown as { ethereum?: ethers.Eip1193Provider }) : undefined;
    const provider = win?.ethereum;
    if (!provider || !address) return null;
    try {
      const web3 = new ethers.BrowserProvider(provider);
      return web3.getSigner();
    } catch {
      return null;
    }
  }, [address]);

  useEffect(() => {
    const win = typeof window !== 'undefined' ? (window as unknown as { ethereum?: ethers.Eip1193Provider & { on?: (event: string, cb: (accounts: string[]) => void) => void; removeListener?: (event: string, cb: (accounts: string[]) => void) => void } }) : undefined;
    const provider = win?.ethereum;
    if (!provider) return;
    const handleAccounts = (accounts: string[]) => {
      if (accounts?.length) setAddress(ethers.getAddress(accounts[0]));
      else setAddress(null);
    };
    const handleChainChanged = () => {
      // Reload the page on chain change as recommended by MetaMask
      if (typeof window !== 'undefined') window.location.reload();
    };
    provider.on?.('accountsChanged', handleAccounts);
    provider.on?.('chainChanged', handleChainChanged);
    return () => {
      provider.removeListener?.('accountsChanged', handleAccounts);
      provider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, []);

  return (
    <WalletContext.Provider value={{ address, isConnecting, error, connect, disconnect, getSigner }}>
      {children}
    </WalletContext.Provider>
  );
}

const defaultWalletValue: WalletContextValue = {
  address: null,
  isConnecting: false,
  error: null,
  connect: async () => {},
  disconnect: () => {},
  getSigner: async () => null,
};

export function useWallet() {
  const ctx = useContext(WalletContext);
  return ctx ?? defaultWalletValue;
}
