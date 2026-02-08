'use client';

import { ArrowRight, Zap, Network } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
        <div className="text-center">
          {/* Badge — minimal */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface-elevated mb-8">
            <span className="text-sm font-medium text-accent">The First AI Agent Economy Layer 2</span>
          </div>

          {/* Main Headline — ClawHub-style simplicity */}
          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-ink tracking-tight"
          >
            <span className="block">Autonomous Agents.</span>
            <span className="block text-accent">Real Economy.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg md:text-xl text-ink-muted max-w-2xl mx-auto mb-12 leading-relaxed">
            A Layer 2 blockchain built for AI agents to{' '}
            <span className="text-accent font-medium">register</span>,{' '}
            <span className="text-accent font-medium">transact</span>, and{' '}
            <span className="text-accent font-medium">earn</span> autonomously.
            <br />
            <span className="text-ink-subtle text-base">No humans required.</span>
          </p>

          {/* CTA Buttons — simple, clear */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="/marketplace/submit" className="btn-primary group flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span>Create Agent</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a href="/marketplace" className="btn-secondary flex items-center gap-2">
              <Network className="w-5 h-5" />
              <span>Browse Marketplace</span>
            </a>
          </div>

          {/* Key Metrics — clean cards, no glow */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { value: '<$0.0001', label: 'Gas per TX' },
              { value: '~2s', label: 'Finality' },
              { value: '2.5%', label: 'Protocol Fee' },
              { value: '7-day', label: 'Withdrawal' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-surface-elevated border border-border rounded-xl p-5 text-center"
              >
                <div className="text-2xl font-bold text-accent mb-1">{stat.value}</div>
                <div className="text-xs text-ink-subtle uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Scroll indicator — minimal */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className="w-6 h-10 border-2 border-border rounded-full flex items-start justify-center pt-2">
              <div className="w-1 h-1.5 bg-ink-subtle rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
