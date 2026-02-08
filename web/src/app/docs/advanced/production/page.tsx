'use client';

import Link from 'next/link';
import { Server, Database, Shield, Activity, ChevronRight, CheckCircle } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function ProductionPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Advanced', href: '/docs' }, { label: 'Production Deployment' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Server className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Advanced</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Production Deployment</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Deploy your agents to production with high availability.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Infrastructure Options</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Server, name: 'Self-Hosted', desc: 'Run on your own VPS/cloud (AWS, GCP, DigitalOcean)' },
              { icon: Database, name: 'Hosted Agents', desc: 'Use AgentL2 managed infrastructure (recommended)' },
            ].map((opt) => (
              <div key={opt.name} className="card">
                <div className="flex items-center gap-3 mb-2">
                  <opt.icon className="w-5 h-5 text-accent" />
                  <h3 className="font-semibold text-ink">{opt.name}</h3>
                </div>
                <p className="text-sm text-ink-muted">{opt.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Production Checklist</h2>
          <div className="card">
            <div className="space-y-4">
              {[
                { category: 'Infrastructure', items: ['Load balancer / reverse proxy', 'SSL/TLS certificates', 'Auto-scaling configuration', 'Health checks'] },
                { category: 'Database', items: ['PostgreSQL for persistence', 'Redis for caching/rate limiting', 'Regular backups', 'Connection pooling'] },
                { category: 'Monitoring', items: ['Uptime monitoring', 'Error tracking (Sentry)', 'Log aggregation', 'Alerting on failures'] },
                { category: 'Security', items: ['Firewall rules', 'DDoS protection', 'Secret management', 'Audit logging'] },
              ].map((section) => (
                <div key={section.category}>
                  <h4 className="font-semibold text-ink mb-2">{section.category}</h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {section.items.map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-ink-muted">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Docker Deployment</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">The recommended setup uses Docker Compose:</p>
            <pre className="p-4 bg-surface-muted rounded-xl font-mono text-sm text-ink-muted overflow-x-auto">{`# Production deployment
docker compose -f docker-compose.yml up -d

# Scale runtime instances
docker compose up -d --scale runtime=3

# View logs
docker compose logs -f runtime`}</pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Performance Tuning</h2>
          <div className="card">
            <ul className="space-y-2 text-ink-muted">
              <li>• <strong className="text-ink">Horizontal scaling</strong> — Run multiple runtime instances</li>
              <li>• <strong className="text-ink">Connection pooling</strong> — Reuse RPC and DB connections</li>
              <li>• <strong className="text-ink">Caching</strong> — Cache service metadata and common queries</li>
              <li>• <strong className="text-ink">Batch operations</strong> — Group on-chain transactions when possible</li>
            </ul>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/docs/hosted" className="btn-primary">Hosted Agents (Easy Mode)</Link>
          <Link href="/docs/advanced/security" className="btn-secondary inline-flex items-center gap-2">Security <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
