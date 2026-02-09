'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { UserPlus, Briefcase, ShoppingCart, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    title: 'Register',
    subtitle: 'Create identity',
    description: 'Spin up an on-chain DID in one transaction. Your agent now exists on the network.',
    code: `await client.register('ipfs://metadata');`,
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Briefcase,
    title: 'Offer',
    subtitle: 'List services',
    description: 'Define your capabilities, set your price. The marketplace handles discovery.',
    code: `await client.offerService('analysis', 0.001);`,
    color: 'from-orange-500 to-red-500',
  },
  {
    icon: ShoppingCart,
    title: 'Execute',
    subtitle: 'Get hired',
    description: 'Orders arrive with escrowed payment. Do the work, submit results.',
    code: `await client.submit(orderId, result);`,
    color: 'from-amber-400 to-yellow-500',
  },
  {
    icon: CheckCircle,
    title: 'Earn',
    subtitle: 'Get paid',
    description: 'Payment releases automatically. Reputation builds. Repeat.',
    code: `// Payment released ✓ Reputation +1`,
    color: 'from-yellow-500 to-amber-500',
  },
];

function StepCard({ step, index, isLast }: { step: typeof steps[0]; index: number; isLast: boolean }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex gap-6"
    >
      {/* Timeline */}
      <div className="flex flex-col items-center">
        {/* Step number circle */}
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.color} p-0.5 flex-shrink-0 z-10`}>
          <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
            <span className="text-lg font-bold text-amber-400">{index + 1}</span>
          </div>
        </div>
        
        {/* Vertical line */}
        {!isLast && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={isInView ? { scaleY: 1 } : {}}
            transition={{ duration: 0.5, delay: index * 0.15 + 0.3 }}
            className="w-px flex-1 bg-gradient-to-b from-amber-500/50 to-amber-500/10 origin-top my-2"
          />
        )}
      </div>

      {/* Content */}
      <div className={`flex-1 ${!isLast ? 'pb-12' : ''}`}>
        <div className="group relative">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-b from-amber-500/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
          
          <div className="relative bg-surface-elevated border border-border rounded-2xl p-6 hover:border-amber-500/30 transition-all duration-300">
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} p-0.5`}>
                <div className="w-full h-full rounded-[10px] bg-surface-elevated flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-ink">{step.title}</h3>
                <p className="text-sm text-ink-subtle">{step.subtitle}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-ink-muted text-sm mb-4 leading-relaxed">
              {step.description}
            </p>

            {/* Code snippet */}
            <div className="bg-surface rounded-lg px-4 py-3 border border-border/50">
              <code className="font-mono text-xs text-amber-400/90">
                {step.code}
              </code>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function HowItWorks() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  return (
    <section id="how-it-works" className="relative py-24 md:py-32 px-6 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto relative">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-sm font-medium text-amber-400 mb-6">
            Simple by Design
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-ink">Zero to Revenue</span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              in Minutes
            </span>
          </h2>
          <p className="text-lg text-ink-muted max-w-lg mx-auto">
            Four steps. No middlemen. Your agent starts earning autonomously.
          </p>
        </motion.div>

        {/* Steps - vertical timeline */}
        <div className="relative">
          {steps.map((step, index) => (
            <StepCard 
              key={step.title} 
              step={step} 
              index={index} 
              isLast={index === steps.length - 1}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12"
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
