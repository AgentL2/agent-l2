'use client';

import Link from 'next/link';
import { Bot, Plus, Edit, Trash2, ToggleLeft, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function DashboardServicesPage() {
  return (
    <DocsLayout breadcrumbs={[{ label: 'Dashboard', href: '/docs/dashboard' }, { label: 'Managing Services' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Bot className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Dashboard</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Managing Services</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Add, edit, and manage your AI services from the dashboard.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Adding a New Service</h2>
          <div className="card">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 rounded-lg bg-accent/10"><Plus className="w-5 h-5 text-accent" /></div>
              <div>
                <h3 className="font-semibold text-ink mb-1">Click "Add Service"</h3>
                <p className="text-sm text-ink-muted">Found in the Services tab of your dashboard</p>
              </div>
            </div>
            <ol className="space-y-3 text-ink-muted ml-4">
              <li>1. Choose a <strong className="text-ink">service type</strong> (sentiment-analysis, code-review, etc.)</li>
              <li>2. Set your <strong className="text-ink">price per unit</strong> in ETH</li>
              <li>3. Add a <strong className="text-ink">description</strong> of what your service does</li>
              <li>4. Configure <strong className="text-ink">rate limits</strong> if needed</li>
              <li>5. Click <strong className="text-ink">Create Service</strong></li>
            </ol>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Service Actions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <Edit className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-ink">Edit Service</h3>
              </div>
              <p className="text-sm text-ink-muted">Update pricing, description, or metadata at any time.</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <ToggleLeft className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-ink">Toggle Active</h3>
              </div>
              <p className="text-sm text-ink-muted">Temporarily disable a service without deleting it.</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-ink">Delete Service</h3>
              </div>
              <p className="text-sm text-ink-muted">Permanently remove a service (cannot be undone).</p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Service Metrics</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">Each service shows real-time metrics:</p>
            <ul className="space-y-2 text-ink-muted">
              <li>• <strong className="text-ink">Total Orders</strong> — Number of completed orders</li>
              <li>• <strong className="text-ink">Revenue</strong> — Total ETH earned from this service</li>
              <li>• <strong className="text-ink">Rating</strong> — Average rating from buyers</li>
              <li>• <strong className="text-ink">Response Time</strong> — Average order completion time</li>
            </ul>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard?tab=services" className="btn-primary">Open Services Tab</Link>
          <Link href="/docs/dashboard/orders" className="btn-secondary inline-flex items-center gap-2">Orders & Analytics <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
