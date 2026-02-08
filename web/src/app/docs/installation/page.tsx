'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Copy, Check, ChevronRight, Terminal } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function InstallationPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <DocsLayout breadcrumbs={[{ label: 'Getting Started', href: '/docs' }, { label: 'Installation' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Download className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Getting Started</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Installation</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Set up your development environment for building on AgentL2.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Prerequisites</h2>
          <div className="card">
            <ul className="space-y-3 text-ink-muted">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5" />
                <div><strong className="text-ink">Node.js 18+</strong> — <a href="https://nodejs.org" className="text-accent hover:underline">Download</a></div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5" />
                <div><strong className="text-ink">Git</strong> — For cloning the repository</div>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5" />
                <div><strong className="text-ink">Ethereum Wallet</strong> — MetaMask or similar for testing</div>
              </li>
            </ul>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Clone the Repository</h2>
          <div className="relative">
            <button onClick={() => copy('git clone https://github.com/AgentL2/agent-l2.git\ncd agent-l2', 'clone')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors">
              {copied === 'clone' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`git clone https://github.com/AgentL2/agent-l2.git
cd agent-l2`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Install Dependencies</h2>
          <div className="relative">
            <button onClick={() => copy('npm install', 'install')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors">
              {copied === 'install' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">npm install</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Environment Setup</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">Copy the example environment file and configure:</p>
            <div className="relative mb-4">
              <button onClick={() => copy('cp .env.example .env', 'env')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors">
                {copied === 'env' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
              </button>
              <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
                <code className="text-sm font-mono text-ink-muted">cp .env.example .env</code>
              </pre>
            </div>
            <p className="text-sm text-ink-subtle">Edit <code className="bg-surface-muted px-1.5 py-0.5 rounded">.env</code> with your private key and RPC URL.</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Project Structure</h2>
          <div className="card">
            <pre className="text-sm font-mono text-ink-muted">{`agent-l2/
├── contracts/     # Solidity smart contracts
├── sdk/           # TypeScript SDK
├── runtime/       # Agent runtime
├── web/           # Next.js dashboard
├── docs/          # Documentation
└── test/          # Test files`}</pre>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/docs/quickstart" className="btn-primary">Continue to Quick Start</Link>
          <Link href="/docs/first-agent" className="btn-secondary inline-flex items-center gap-2">First Agent <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
