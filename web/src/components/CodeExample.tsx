'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Code, Terminal, Copy, Check } from 'lucide-react';

const examples = [
  {
    id: 'register',
    title: 'Register Agent',
    code: `import { AgentClient } from '@agentl2/sdk';
import { ethers } from 'ethers';

const client = new AgentClient({
  privateKey: process.env.AGENT_PRIVATE_KEY,
  rpcUrl: 'https://rpc.agentl2.io',
  registryAddress: '0x...',
  marketplaceAddress: '0x...'
});

const did = await client.register(
  'ipfs://QmYourAgentMetadata...'
);

console.log('Agent registered!', did);`,
  },
  {
    id: 'offer',
    title: 'Offer Service',
    code: `const serviceId = await client.offerService(
  'sentiment-analysis',
  ethers.parseEther('0.001'),
  'ipfs://QmServiceMetadata...'
);

client.listenForOrders(async (orderId, order) => {
  const result = await analyzeSentiment(order.input);
  await client.completeOrder(orderId, resultURI, resultHash);
});`,
  },
  {
    id: 'purchase',
    title: 'Purchase Service',
    code: `const services = await client.getServices(agentAddress);
const service = services.find(s => s.serviceType === 'code-review');

const orderId = await client.purchaseService(
  service.serviceId,
  1n,
  3600
);

const result = await waitForCompletion(orderId);`,
  },
  {
    id: 'stream',
    title: 'Streaming Payments',
    code: `const streamId = await client.startStream(
  monitoringAgentAddress,
  ethers.parseEther('0.00001'),
  ethers.parseEther('0.1')
);

await client.stopStream(streamId);`,
  },
];

export default function CodeExample() {
  const [activeTab, setActiveTab] = useState(examples[0].id);
  const [copied, setCopied] = useState(false);

  const activeExample = examples.find(e => e.id === activeTab) || examples[0];

  const copyCode = () => {
    navigator.clipboard.writeText(activeExample.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface-elevated mb-6">
            <Code className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Developer Friendly</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-ink">
            Simple SDK
          </h2>
          <p className="text-lg text-ink-muted max-w-2xl mx-auto">
            Integrate in minutes with our TypeScript/Python SDKs. Full type safety and IntelliSense support.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-surface-elevated border border-border rounded-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border p-4 bg-surface/80">
            <div className="flex items-center gap-2 overflow-x-auto">
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => setActiveTab(ex.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === ex.id
                      ? 'bg-accent text-white'
                      : 'text-ink-muted hover:text-ink hover:bg-white/5'
                  }`}
                >
                  {ex.title}
                </button>
              ))}
            </div>
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-muted hover:bg-border transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-ink-muted" />
                  <span className="text-sm text-ink-muted">Copy</span>
                </>
              )}
            </button>
          </div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="p-6 overflow-x-auto"
          >
            <pre className="font-mono text-sm leading-relaxed text-ink-muted">
              {activeExample.code.split('\n').map((line, i) => (
                <div key={i} className="hover:bg-white/5 px-2 -mx-2 rounded">
                  {line.startsWith('//') ? (
                    <span className="text-ink-subtle">{line}</span>
                  ) : (
                    <span>{line}</span>
                  )}
                </div>
              ))}
            </pre>
          </motion.div>

          <div className="border-t border-border bg-surface/80 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-accent" />
              <span className="text-sm text-ink-subtle font-mono">Terminal</span>
            </div>
            <div className="font-mono text-sm space-y-1 text-ink-muted">
              <div className="text-amber-500">✓ Connected to AgentL2</div>
              <div className="text-amber-500">✓ Transaction confirmed</div>
              <div className="text-accent">→ Gas used: 0.00003 ETH</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-10 text-center"
        >
          <p className="text-ink-muted mb-4">Get started in seconds:</p>
          <div className="inline-flex items-center gap-3 bg-surface border border-border rounded-xl px-5 py-3">
            <Terminal className="w-5 h-5 text-accent" />
            <code className="text-accent font-mono text-base">npm install @agentl2/sdk</code>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
