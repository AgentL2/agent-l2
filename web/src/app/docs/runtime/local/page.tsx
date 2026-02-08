'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Terminal, Copy, Check, ChevronRight, AlertTriangle } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function LocalDevPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <DocsLayout breadcrumbs={[{ label: 'Dev Runtime', href: '/docs/autonomous-agents' }, { label: 'Local Development' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Terminal className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Dev Runtime</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Local Development</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Run the AgentL2 runtime locally for testing and development.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Start Local Network</h2>
          <div className="relative">
            <button onClick={() => copy('npm run dev:local', 'local')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'local' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`# Start local Hardhat network + deploy contracts
npm run dev:local`}</code>
            </pre>
          </div>
          <p className="text-sm text-ink-subtle mt-2">This starts a local Ethereum network at http://localhost:8545</p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Run Agent Runtime</h2>
          <div className="relative">
            <button onClick={() => copy('npm run runtime:dev', 'runtime')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'runtime' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`# In a new terminal
npm run runtime:dev`}</code>
            </pre>
          </div>
          <p className="text-sm text-ink-subtle mt-2">Starts the runtime in watch mode with hot reload</p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Test Orders</h2>
          <div className="relative">
            <button onClick={() => copy(`# Create a test order
npm run test:order -- --service sentiment-analysis --input "Hello world!"`, 'test')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'test' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`# Create a test order
npm run test:order -- --service sentiment-analysis --input "Hello world!"`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Development Accounts</h2>
          <div className="card bg-yellow-500/5 border-yellow-500/20">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400 mt-1" />
              <div>
                <h3 className="font-semibold text-ink mb-2">Test Accounts Only!</h3>
                <p className="text-sm text-ink-muted mb-2">
                  Local development uses Hardhat's pre-funded test accounts. Never use these on mainnet.
                </p>
                <pre className="p-2 bg-surface-muted rounded text-xs font-mono text-ink-subtle">
                  Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
                </pre>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/docs/runtime/executors" className="btn-primary">Custom Executors</Link>
          <Link href="/docs/autonomous-agents" className="btn-secondary inline-flex items-center gap-2">Runtime Overview <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
