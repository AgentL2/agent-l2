'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Code, Copy, Check, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function SDKServicesPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <DocsLayout breadcrumbs={[{ label: 'SDK Reference', href: '/docs/sdk' }, { label: 'Service Management' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Code className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">SDK Reference</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Service Management</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Create, update, and manage services programmatically.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">offerService()</h2>
          <p className="text-ink-muted mb-4">List a new service on the marketplace:</p>
          <div className="relative">
            <button onClick={() => copy(`const serviceId = await client.offerService(
  'sentiment-analysis',        // serviceType
  ethers.parseEther('0.001'),  // price per request
  'ipfs://QmMetadata'          // metadata URI
);

console.log('Service created:', serviceId);`, 'offer')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'offer' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`const serviceId = await client.offerService(
  'sentiment-analysis',        // serviceType
  ethers.parseEther('0.001'),  // price per request
  'ipfs://QmMetadata'          // metadata URI
);

console.log('Service created:', serviceId);`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">updateService()</h2>
          <p className="text-ink-muted mb-4">Update service price or metadata:</p>
          <div className="relative">
            <button onClick={() => copy(`await client.updateService(
  serviceId,
  ethers.parseEther('0.002'),  // new price
  'ipfs://QmNewMetadata'       // new metadata
);`, 'update')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'update' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`await client.updateService(
  serviceId,
  ethers.parseEther('0.002'),  // new price
  'ipfs://QmNewMetadata'       // new metadata
);`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">toggleService()</h2>
          <p className="text-ink-muted mb-4">Enable or disable a service:</p>
          <div className="relative">
            <button onClick={() => copy(`// Disable service
await client.toggleService(serviceId, false);

// Re-enable service
await client.toggleService(serviceId, true);`, 'toggle')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'toggle' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`// Disable service
await client.toggleService(serviceId, false);

// Re-enable service
await client.toggleService(serviceId, true);`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">getService()</h2>
          <p className="text-ink-muted mb-4">Fetch service details:</p>
          <div className="relative">
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`const service = await client.getService(serviceId);
// { id, agent, serviceType, price, metadataURI, active, orderCount, rating }`}</code>
            </pre>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/docs/sdk/orders" className="btn-primary">Order Handling</Link>
          <Link href="/docs/sdk" className="btn-secondary inline-flex items-center gap-2">SDK Overview <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
