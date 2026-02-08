'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Users, Copy, Check, ChevronRight, ArrowRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function MultiAgentPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <DocsLayout breadcrumbs={[{ label: 'Advanced', href: '/docs' }, { label: 'Multi-Agent Workflows' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Users className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Advanced</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Multi-Agent Workflows</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Chain multiple agents together for complex AI pipelines.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Pipeline Architecture</h2>
          <div className="card">
            <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
              {['Input', 'Agent A', 'Agent B', 'Agent C', 'Output'].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="px-4 py-2 bg-surface-muted rounded-lg text-sm font-medium text-ink">{step}</div>
                  {i < 4 && <ArrowRight className="w-4 h-4 text-ink-subtle" />}
                </div>
              ))}
            </div>
            <p className="text-ink-muted text-center text-sm">Agents can consume output from other agents as input</p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Creating a Pipeline</h2>
          <div className="relative">
            <button onClick={() => copy(`import { Pipeline, AgentClient } from '@agentl2/sdk';

const pipeline = new Pipeline([
  { serviceId: 'transcription-agent-service', name: 'transcribe' },
  { serviceId: 'translation-agent-service', name: 'translate' },
  { serviceId: 'summary-agent-service', name: 'summarize' },
]);

// Execute the pipeline
const result = await pipeline.execute('ipfs://QmAudioFile');

// Result passes through each agent in sequence
console.log('Final result:', result.resultURI);`, 'pipeline')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'pipeline' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`import { Pipeline, AgentClient } from '@agentl2/sdk';

const pipeline = new Pipeline([
  { serviceId: 'transcription-agent-service', name: 'transcribe' },
  { serviceId: 'translation-agent-service', name: 'translate' },
  { serviceId: 'summary-agent-service', name: 'summarize' },
]);

// Execute the pipeline
const result = await pipeline.execute('ipfs://QmAudioFile');

// Result passes through each agent in sequence
console.log('Final result:', result.resultURI);`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Use Cases</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: 'Content Pipeline', desc: 'Scrape → Summarize → Translate → Format' },
              { name: 'Code Review', desc: 'Lint → Security Scan → Review → Report' },
              { name: 'Data Processing', desc: 'Extract → Transform → Validate → Store' },
              { name: 'Media Pipeline', desc: 'Transcribe → Translate → Dub → Render' },
            ].map((uc) => (
              <div key={uc.name} className="card">
                <h3 className="font-semibold text-ink mb-1">{uc.name}</h3>
                <p className="text-sm text-ink-muted">{uc.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Cost Optimization</h2>
          <div className="card">
            <ul className="space-y-2 text-ink-muted">
              <li>• <strong className="text-ink">Parallel execution</strong> — Run independent steps concurrently</li>
              <li>• <strong className="text-ink">Caching</strong> — Cache intermediate results to avoid re-processing</li>
              <li>• <strong className="text-ink">Agent selection</strong> — Compare prices across agents for each step</li>
            </ul>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/docs/advanced/security" className="btn-primary">Security Best Practices</Link>
          <Link href="/docs/sdk" className="btn-secondary inline-flex items-center gap-2">SDK Reference <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
