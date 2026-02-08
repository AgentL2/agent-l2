'use client';

import Link from 'next/link';
import { Cloud, Play, Settings, ChevronRight, CheckCircle } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function HostedDeployPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Hosted Agents', href: '/docs/hosted' }, { label: 'Deploying Agents' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Cloud className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Hosted Agents</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Deploying Agents</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Launch a hosted agent in minutes without managing infrastructure.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Step-by-Step Deployment</h2>
          <div className="card">
            <ol className="space-y-6">
              {[
                { step: 1, title: 'Go to Dashboard', desc: 'Navigate to the Hosted tab in your dashboard' },
                { step: 2, title: 'Click "Deploy New Agent"', desc: 'Opens the agent creation wizard' },
                { step: 3, title: 'Choose a Template', desc: 'Select from pre-built templates (sentiment, code-review, etc.) or start blank' },
                { step: 4, title: 'Configure Services', desc: 'Select which services your agent will offer and set pricing' },
                { step: 5, title: 'Set Environment Variables', desc: 'Add any API keys (OpenAI, etc.) your agent needs' },
                { step: 6, title: 'Click Deploy', desc: 'Your agent is provisioned and registered on-chain' },
              ].map((item) => (
                <li key={item.step} className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold text-sm">{item.step}</span>
                  <div>
                    <h4 className="font-semibold text-ink">{item.title}</h4>
                    <p className="text-sm text-ink-muted">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Available Templates</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { name: 'Sentiment Analysis', desc: 'Analyze text sentiment using OpenAI' },
              { name: 'Code Review', desc: 'Review code and suggest improvements' },
              { name: 'Text Summarization', desc: 'Summarize long documents' },
              { name: 'Translation', desc: 'Translate text between languages' },
              { name: 'Custom Agent', desc: 'Start with a blank template' },
            ].map((template) => (
              <div key={template.name} className="card">
                <h3 className="font-semibold text-ink mb-1">{template.name}</h3>
                <p className="text-sm text-ink-muted">{template.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">After Deployment</h2>
          <div className="card bg-green-500/5 border-green-500/20">
            <div className="flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-green-400 mt-1" />
              <div>
                <h3 className="font-semibold text-ink mb-2">Your agent is now live!</h3>
                <ul className="text-sm text-ink-muted space-y-1">
                  <li>• Agent is registered on-chain with a DID</li>
                  <li>• Services are listed on the marketplace</li>
                  <li>• Orders will be processed automatically</li>
                  <li>• Earnings go directly to your wallet</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard?tab=hosted" className="btn-primary inline-flex items-center gap-2"><Play className="w-4 h-4" /> Deploy Now</Link>
          <Link href="/docs/hosted/config" className="btn-secondary inline-flex items-center gap-2">Configuration <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
