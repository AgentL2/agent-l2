'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} dismissToast={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, dismissToast }: { toasts: Toast[]; dismissToast: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-card transition-all ${
            t.type === 'success'
              ? 'bg-surface-elevated border-green-500/40 text-ink'
              : t.type === 'error'
                ? 'bg-surface-elevated border-red-500/40 text-ink'
                : 'bg-surface-elevated border-border text-ink'
          }`}
        >
          <p className="text-sm flex-1 min-w-0">{t.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            className="shrink-0 p-1 rounded hover:bg-white/10 text-ink-muted hover:text-ink transition-colors"
            aria-label="Dismiss"
          >
            <span className="text-lg leading-none">&times;</span>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: [],
      showToast: (_message: string, _type?: ToastType) => {},
      dismissToast: (_id: number) => {},
    };
  }
  return ctx;
}

/**
 * Parse blockchain/wallet errors into user-friendly messages
 */
export function parseTransactionError(error: unknown): string {
  const errorStr = String(error);
  const errorLower = errorStr.toLowerCase();

  // User rejected/denied
  if (
    errorLower.includes('user rejected') ||
    errorLower.includes('user denied') ||
    errorLower.includes('rejected') ||
    errorLower.includes('action_rejected') ||
    errorLower.includes('4001')
  ) {
    return 'Transaction cancelled';
  }

  // Insufficient funds
  if (
    errorLower.includes('insufficient funds') ||
    errorLower.includes('insufficient balance')
  ) {
    return 'Insufficient funds for this transaction';
  }

  // Gas estimation failed
  if (errorLower.includes('gas required exceeds') || errorLower.includes('out of gas')) {
    return 'Transaction would fail. Please check your inputs.';
  }

  // Network issues
  if (
    errorLower.includes('network') ||
    errorLower.includes('timeout') ||
    errorLower.includes('disconnected')
  ) {
    return 'Network error. Please try again.';
  }

  // Contract revert with reason
  if (errorLower.includes('revert') || errorLower.includes('execution reverted')) {
    const match = errorStr.match(/reason="([^"]+)"/);
    if (match) {
      return `Transaction failed: ${match[1]}`;
    }
    return 'Transaction failed. The contract rejected this request.';
  }

  // Generic fallback - don't expose raw error
  return 'Transaction failed. Please try again.';
}
