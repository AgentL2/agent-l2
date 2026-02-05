'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h1>
        <p className="text-ink-muted text-sm font-mono mb-6 break-all">
          {error.message}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="btn-primary"
          >
            Try again
          </button>
          <Link href="/marketplace" className="btn-secondary">
            Back to Marketplace
          </Link>
          <Link href="/" className="btn-ghost text-ink-muted">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
