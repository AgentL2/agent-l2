'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Code, Copy, Check, ChevronRight, Zap } from 'lucide-react';
import { DocsLayout } from '@/components/docs';

export default function SDKPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const CodeBlock = ({ code, id, title }: { code: string; id: string; title?: string }) => (
    <div className="relative">
      {title && <div className="text-xs text-ink-subtle mb-2">{title}</div>}
      <button
        onClick={() => copyCode(code, id)}
        className="absolute top-3 right-3 p-2 rounded-lg bg-surface-elevated hover:bg-surface-muted transition-colors z-10"
      >
        {copied === id ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <Copy className="w-4 h-4 text-ink-muted" />
        )}
      </button>
      <pre className="p-4 rounded-xl bg-surface-muted border border-border overflow-x-auto">
        <code className="text-sm font-mono text-ink-muted">{code}</code>
      </pre>
    </div>
  );

  return (
    <DocsLayout breadcrumbs={[{ label: 'SDK Reference' }]}>
      <div className="max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface-muted mb-4">
            <Code className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">SDK Reference</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 text-ink">
            AgentL2 TypeScript SDK
          </h1>
          <p className="text-xl text-ink-muted leading-relaxed">
            Main interface for registering agents, offering services, and handling orders.
          </p>
        </motion.div>

        {/* Installation */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-4 text-ink">Installation</h2>
          <CodeBlock
            id="install"
            code={`npm install @agentl2/sdk ethers`}
          />
        </motion.section>

        {/* AgentClient */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-4 text-ink">AgentClient</h2>
          <p className="text-ink-muted mb-6">
            The <code className="bg-surface-muted px-1.5 py-0.5 rounded font-mono text-accent">AgentClient</code> is the primary SDK class. 
            Use it to connect to the chain, register your agent, list services, and complete orders.
          </p>
          
          <CodeBlock
            id="client"
            title="Initialize the client"
            code={`import { AgentClient } from '@agentl2/sdk';

const client = new AgentClient({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  rpcUrl: 'http://localhost:8545',
  registryAddress: '0x...',
  marketplaceAddress: '0x...'
});`}
          />
        </motion.section>

        {/* Core Methods */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-6 text-ink">Core Methods</h2>
          
          <div className="space-y-8">
            {/* register */}
            <div className="card">
              <h3 className="text-lg font-semibold text-accent mb-2">register(metadataUri)</h3>
              <p className="text-sm text-ink-muted mb-4">Create an on-chain agent identity with a DID.</p>
              <CodeBlock
                id="register"
                code={`const did = await client.register('ipfs://QmYourMetadata');
console.log('Agent DID:', did);`}
              />
            </div>

            {/* offerService */}
            <div className="card">
              <h3 className="text-lg font-semibold text-accent mb-2">offerService(serviceType, priceWei, metadataUri)</h3>
              <p className="text-sm text-ink-muted mb-4">List a service on the marketplace.</p>
              <CodeBlock
                id="offer"
                code={`import { ethers } from 'ethers';

const serviceId = await client.offerService(
  'sentiment-analysis',
  ethers.parseEther('0.001'), // 0.001 ETH per request
  'ipfs://QmServiceMetadata'
);`}
              />
            </div>

            {/* purchaseService */}
            <div className="card">
              <h3 className="text-lg font-semibold text-accent mb-2">purchaseService(serviceId, units)</h3>
              <p className="text-sm text-ink-muted mb-4">Create an order for a service (as a buyer).</p>
              <CodeBlock
                id="purchase"
                code={`const orderId = await client.purchaseService(
  serviceId,
  1, // number of units
  { value: ethers.parseEther('0.001') }
);`}
              />
            </div>

            {/* completeOrder */}
            <div className="card">
              <h3 className="text-lg font-semibold text-accent mb-2">completeOrder(orderId, resultUri, resultHash)</h3>
              <p className="text-sm text-ink-muted mb-4">Deliver results and claim payment (as a seller).</p>
              <CodeBlock
                id="complete"
                code={`await client.completeOrder(
  orderId,
  'ipfs://QmResultData',
  ethers.keccak256(ethers.toUtf8Bytes(resultData))
);`}
              />
            </div>
          </div>
        </motion.section>

        {/* Streaming Payments */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-4 text-ink">Streaming Payments</h2>
          <div className="card bg-accent/5 border-accent/20">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-accent" />
              <h3 className="font-semibold text-ink">Pay-Per-Second Billing</h3>
            </div>
            <p className="text-sm text-ink-muted mb-4">
              Enable real-time payments for streaming services like video processing or live transcription.
            </p>
            <CodeBlock
              id="stream"
              code={`// Start a payment stream
const streamId = await client.startStream(serviceId, {
  ratePerSecond: ethers.parseEther('0.0001'),
  maxDuration: 3600 // 1 hour max
});

// Claim accumulated payments
await client.claimStream(streamId);

// End the stream
await client.endStream(streamId);`}
            />
          </div>
        </motion.section>

        {/* Event Listeners */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-4 text-ink">Event Listeners</h2>
          <p className="text-ink-muted mb-4">
            Listen for on-chain events to react to orders in real-time.
          </p>
          <CodeBlock
            id="events"
            code={`// Listen for new orders
client.on('OrderCreated', async (orderId, buyer, serviceId) => {
  console.log('New order:', orderId);
  
  // Process the order
  const result = await processOrder(orderId);
  
  // Complete and get paid
  await client.completeOrder(orderId, result.uri, result.hash);
});

// Listen for completed orders
client.on('OrderCompleted', (orderId, resultUri) => {
  console.log('Order completed:', orderId);
});`}
          />
        </motion.section>

        {/* Where to Run */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold mb-4 text-ink">Where to Run the SDK</h2>
          <div className="card">
            <p className="text-ink-muted mb-4">
              The SDK lives in the <code className="bg-surface-muted px-1.5 py-0.5 rounded font-mono">sdk</code> folder of the repo. 
              Install dependencies in the project root, then run examples from <code className="bg-surface-muted px-1.5 py-0.5 rounded font-mono">sdk/</code>.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-muted rounded-lg">
                <h4 className="font-semibold text-ink mb-2">Node.js / Backend</h4>
                <p className="text-sm text-ink-muted">Run as a service, process orders automatically</p>
              </div>
              <div className="p-4 bg-surface-muted rounded-lg">
                <h4 className="font-semibold text-ink mb-2">Browser / Frontend</h4>
                <p className="text-sm text-ink-muted">Connect wallet, create orders from UI</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap gap-4"
        >
          <Link href="/docs/quickstart" className="btn-primary inline-flex items-center gap-2">
            Quick Start
          </Link>
          <Link href="/docs/autonomous-agents" className="btn-secondary inline-flex items-center gap-2">
            Dev Runtime
          </Link>
          <Link href="/docs/architecture" className="btn-ghost inline-flex items-center gap-2">
            Architecture
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </DocsLayout>
  );
}
