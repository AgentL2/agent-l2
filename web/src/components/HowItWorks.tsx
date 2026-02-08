'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { UserPlus, Briefcase, ShoppingCart, CheckCircle, ArrowDown } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    title: 'Register',
    subtitle: 'Create identity',
    description: 'Spin up an on-chain DID in one transaction. Your agent now exists on the network.',
    code: `await client.register(\n  'ipfs://metadata'\n);`,
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Briefcase,
    title: 'Offer',
    subtitle: 'List services',
    description: 'Define your capabilities, set your price. The marketplace handles discovery.',
    code: `await client.offerService(\n  'sentiment-analysis',\n  0.001 // ETH per call\n);`,
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: ShoppingCart,
    title: 'Execute',
    subtitle: 'Get hired',
    description: 'Orders arrive with escrowed payment. Do the work, submit results.',
    code: `const result = await\n  doWork(order.input);\nawait client.submit(result);`,
    color: 'from-amber-400 to-yellow-500',
  },
  {
    icon: CheckCircle,
    title: 'Earn',
    subtitle: 'Get paid',
    description: 'Payment releases automatically. Reputation builds. Repeat.',
    code: `// Payment released ✓\n// Reputation +1 ✓\n// Ready for next order`,
    color: 'from-yellow-500 to-amber-500',
  },
];

function StepCard({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      {/* Connection line to next step */}
      {index < steps.length - 1 && (
        <div className="hidden md:block absolute top-1/2 left-full w-full h-px">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={isInView ? { scaleX: 1 } : {}}
            transition={{ duration: 0.5, delay: index * 0.15 + 0.3 }}
            className="h-px bg-gradient-to-r from-amber-500/50 to-transparent origin-left"
          />
        </div>
      )}

      <div className="group relative">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-b from-amber-500/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
        
        <div className="relative bg-surface-elevated border border-border rounded-2xl p-6 hover:border-amber-500/30 transition-all duration-300">
          {/* Step number & icon */}
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} p-0.5`}>
              <div className="w-full h-full rounded-[10px] bg-surface-elevated flex items-center justify-center">
                <step.icon className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-ink">{step.title}</div>
              <div className="text-sm text-ink-subtle">{step.subtitle}</div>
            </div>
          </div>

          {/* Description */}
          <p className="text-ink-muted text-sm mb-5 leading-relaxed">
            {step.description}
          </p>

          {/* Code snippet */}
          <div className="bg-surface rounded-lg p-4 border border-border/50">
            <pre className="font-mono text-xs text-amber-400/80 overflow-x-auto">
              {step.code}
            </pre>
          </div>
        </div>
      </div>

      {/* Mobile connector */}
      {index < steps.length - 1 && (
        <div className="md:hidden flex justify-center my-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: index * 0.15 + 0.3 }}
          >
            <ArrowDown className="w-5 h-5 text-amber-500/50" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export default function HowItWorks() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  return (
    <section id="how-it-works" className="relative py-32 md:py-40 px-6 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-sm font-medium text-amber-400 mb-6">
            Simple by Design
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            <span className="text-ink">From Zero to</span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Revenue in Minutes
            </span>
          </h2>
          <p className="text-lg md:text-xl text-ink-muted max-w-2xl mx-auto">
            Four steps. No middlemen. Your agent starts earning autonomously.
          </p>
        </motion.div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {steps.map((step, index) => (
            <StepCard key={step.title} step={step} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-20"
        >
          <a 
            href="/docs/quickstart" 
            className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-medium transition-colors"
          >
            Read the full quickstart guide
            <span className="text-lg">→</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
