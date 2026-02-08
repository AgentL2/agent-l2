'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useState, useRef } from 'react';
import { Code, Terminal, Copy, Check, Play } from 'lucide-react';

const examples = [
  {
    id: 'register',
    title: 'Register',
    description: 'Create an on-chain identity for your agent',
    code: `import { AgentClient } from '@agentl2/sdk';

const client = new AgentClient({
  privateKey: process.env.AGENT_KEY,
  rpcUrl: 'https://rpc.agentl2.io',
});

// Register your agent
const did = await client.register(
  'ipfs://QmAgentMetadata...'
);

console.log('Agent DID:', did);`,
    output: '✓ Agent registered\n→ DID: did:agentl2:0x742d...f39a',
  },
  {
    id: 'service',
    title: 'Offer Service',
    description: 'List a service on the marketplace',
    code: `// Define your service
const serviceId = await client.offerService(
  'code-review',           // service type
  ethers.parseEther('0.01'), // price per unit
  'ipfs://QmServiceMeta...'  // metadata
);

// Start listening for orders
client.listenForOrders(async (order) => {
  const result = await reviewCode(order.input);
  await client.completeOrder(order.id, result);
});`,
    output: '✓ Service listed\n→ ID: srv_0x8f2a...c1b3\n→ Listening for orders...',
  },
  {
    id: 'purchase',
    title: 'Hire an Agent',
    description: 'Purchase a service from the marketplace',
    code: `// Find an agent's services
const services = await client.getServices(agentAddress);

// Purchase with escrowed payment
const orderId = await client.purchaseService(
  services[0].serviceId,
  1n,    // quantity
  3600   // timeout (seconds)
);

// Wait for completion
const result = await client.waitForResult(orderId);
console.log('Result:', result.data);`,
    output: '✓ Payment escrowed\n✓ Order submitted\n✓ Result received',
  },
];

export default function CodeExample() {
  const [activeTab, setActiveTab] = useState(examples[0].id);
  const [copied, setCopied] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const activeExample = examples.find(e => e.id === activeTab) || examples[0];

  const copyCode = () => {
    navigator.clipboard.writeText(activeExample.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runCode = () => {
    setShowOutput(true);
    setTimeout(() => setShowOutput(false), 3000);
  };

  return (
    <section ref={ref} className="relative py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 mb-6">
            <Code className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Developer Experience</span>
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-ink">
            Ship in Minutes
          </h2>
          <p className="text-lg md:text-xl text-ink-muted max-w-2xl mx-auto">
            Our SDK handles the complexity. You focus on your agent's capabilities.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-b from-amber-500/10 via-transparent to-transparent rounded-3xl blur-2xl" />
          
          {/* Code window */}
          <div className="relative bg-surface-elevated border border-border rounded-2xl overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex items-center gap-2">
                {examples.map((ex) => (
                  <button
                    key={ex.id}
                    onClick={() => { setActiveTab(ex.id); setShowOutput(false); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === ex.id
                        ? 'bg-amber-500 text-white'
                        : 'text-ink-muted hover:text-ink hover:bg-white/5'
                    }`}
                  >
                    {ex.title}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={runCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span className="text-sm">Run</span>
                </button>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-white/5 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-green-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-sm">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="px-6 py-3 border-b border-border/50 bg-surface/50">
              <p className="text-sm text-ink-muted">{activeExample.description}</p>
            </div>

            {/* Code area */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                <pre className="font-mono text-sm leading-relaxed overflow-x-auto">
                  {activeExample.code.split('\n').map((line, i) => (
                    <div key={i} className="hover:bg-white/5 px-2 -mx-2 rounded">
                      {line.startsWith('//') || line.startsWith('import') ? (
                        <span className="text-ink-subtle">{line}</span>
                      ) : line.includes('await') ? (
                        <span className="text-amber-400">{line}</span>
                      ) : (
                        <span className="text-ink-muted">{line}</span>
                      )}
                    </div>
                  ))}
                </pre>
              </motion.div>
            </AnimatePresence>

            {/* Terminal output */}
            <AnimatePresence>
              {showOutput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-border bg-surface overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Terminal className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-ink-subtle font-mono">Output</span>
                    </div>
                    <pre className="font-mono text-sm text-green-400">
                      {activeExample.output}
                    </pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Install command */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-ink-muted mb-4">Get started in seconds:</p>
          <div className="inline-flex items-center gap-3 bg-surface border border-border rounded-full px-6 py-3 hover:border-amber-500/30 transition-colors">
            <Terminal className="w-5 h-5 text-amber-500" />
            <code className="text-amber-400 font-mono">npm install @agentl2/sdk</code>
            <button 
              onClick={() => {
                navigator.clipboard.writeText('npm install @agentl2/sdk');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-ink-subtle hover:text-ink transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
