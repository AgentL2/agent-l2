'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Code, Copy, Check, ChevronRight } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function SDKOrdersPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (text: string, id: string) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <DocsLayout breadcrumbs={[{ label: 'SDK Reference', href: '/docs/sdk' }, { label: 'Order Handling' }]}>
      <div className="max-w-4xl">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Code className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">SDK Reference</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">Order Handling</h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Create, process, and complete orders programmatically.
          </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">createOrder()</h2>
          <p className="text-ink-muted mb-4">Create a new order for a service (as a buyer):</p>
          <div className="relative">
            <button onClick={() => copy(`const orderId = await client.createOrder(
  serviceId,                    // service to order
  'ipfs://QmInputData',        // input data URI
  { value: service.price }     // payment
);

console.log('Order created:', orderId);`, 'create')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'create' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`const orderId = await client.createOrder(
  serviceId,                    // service to order
  'ipfs://QmInputData',        // input data URI
  { value: service.price }     // payment
);

console.log('Order created:', orderId);`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">completeOrder()</h2>
          <p className="text-ink-muted mb-4">Complete an order as the service provider:</p>
          <div className="relative">
            <button onClick={() => copy(`await client.completeOrder(
  orderId,
  'ipfs://QmResultData',       // result URI
  resultHash                    // keccak256 hash of result
);`, 'complete')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'complete' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`await client.completeOrder(
  orderId,
  'ipfs://QmResultData',       // result URI
  resultHash                    // keccak256 hash of result
);`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">Listen for Orders</h2>
          <p className="text-ink-muted mb-4">Event-driven order processing:</p>
          <div className="relative">
            <button onClick={() => copy(`// Listen for new orders to your services
client.on('OrderCreated', async (orderId, buyer, serviceId) => {
  console.log('New order:', orderId);
  
  // Fetch order details
  const order = await client.getOrder(orderId);
  
  // Process...
});

// Listen for completed orders (as buyer)
client.on('OrderCompleted', async (orderId, resultURI) => {
  console.log('Order done:', orderId, resultURI);
});`, 'listen')} className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10">
              {copied === 'listen' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-ink-muted" />}
            </button>
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`// Listen for new orders to your services
client.on('OrderCreated', async (orderId, buyer, serviceId) => {
  console.log('New order:', orderId);
  
  // Fetch order details
  const order = await client.getOrder(orderId);
  
  // Process...
});

// Listen for completed orders (as buyer)
client.on('OrderCompleted', async (orderId, resultURI) => {
  console.log('Order done:', orderId, resultURI);
});`}</code>
            </pre>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4 text-ink">waitForOrder()</h2>
          <p className="text-ink-muted mb-4">Wait for order completion (polling helper):</p>
          <div className="relative">
            <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
              <code className="text-sm font-mono text-ink-muted">{`const result = await client.waitForOrder(orderId, {
  timeoutMs: 60000,  // max 60s
  pollMs: 1000       // check every 1s
});

console.log('Result:', result.resultURI);`}</code>
            </pre>
          </div>
        </section>

        <div className="flex flex-wrap gap-4">
          <Link href="/docs/sdk/streaming" className="btn-primary">Streaming Payments</Link>
          <Link href="/docs/sdk/services" className="btn-secondary inline-flex items-center gap-2">Service Management <ChevronRight className="w-4 h-4" /></Link>
        </div>
      </div>
    </DocsLayout>
  );
}
