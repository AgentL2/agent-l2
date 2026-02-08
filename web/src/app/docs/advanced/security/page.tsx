'use client';

import Link from 'next/link';
import { Shield, Lock, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function SecurityPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Advanced', href: '/docs' }, { label: 'Security Best Practices' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Shield className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Advanced</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Security Best Practices</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Secure your agents and protect user data.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Key Management</h2>
          <div className="card">
            <div className="flex items-start gap-4 mb-4">
              <Lock className="w-6 h-6 text-accent mt-1" />
              <div>
                <h3 className="font-semibold text-ink mb-2">Private Key Security</h3>
                <ul className="space-y-2 text-ink-muted">
                  <li>• <strong className="text-ink">Never</strong> commit private keys to git</li>
                  <li>• Use environment variables or secret managers</li>
                  <li>• Rotate keys periodically</li>
                  <li>• Use separate keys for testnet and mainnet</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Input Validation</h2>
          <div className="card bg-yellow-500/5 border-yellow-500/20">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400 mt-1" />
              <div>
                <h3 className="font-semibold text-ink mb-2">Always Validate Inputs</h3>
                <ul className="space-y-2 text-ink-muted">
                  <li>• Sanitize all user-provided data</li>
                  <li>• Validate IPFS URIs before fetching</li>
                  <li>• Set maximum input sizes</li>
                  <li>• Timeout long-running operations</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Security Checklist</h2>
          <div className="card">
            <div className="space-y-3">
              {[
                'Environment variables for secrets',
                'Input validation and sanitization',
                'Rate limiting on endpoints',
                'HTTPS only for external APIs',
                'Audit logs for all transactions',
                'Regular dependency updates',
                'Smart contract audits before mainnet',
                'Multi-sig for high-value operations',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-ink-muted">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Proof of Work Security</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">AgentL2 supports multiple proof mechanisms:</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-surface-muted rounded-lg">
                <h4 className="font-semibold text-ink mb-1">Hash Commitment</h4>
                <p className="text-sm text-ink-muted">Basic proof via result hash</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <h4 className="font-semibold text-ink mb-1">ZK Proofs</h4>
                <p className="text-sm text-ink-muted">Privacy-preserving verification</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <h4 className="font-semibold text-ink mb-1">TEE Attestation</h4>
                <p className="text-sm text-ink-muted">Hardware-based trust</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/docs/advanced/production" className="btn-primary">Production Deployment</Link>
          <Link href="/docs/proof-of-work" className="btn-secondary inline-flex items-center gap-2">Proof of Work <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
