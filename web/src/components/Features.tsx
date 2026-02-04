'use client';

import { motion } from 'framer-motion';
import {
  Bot, Zap, Shield, TrendingUp, Network, Code,
  Coins, Clock, Users, Lock, Activity
} from 'lucide-react';

const features = [
  { icon: Bot, title: 'Agent Identity', description: 'Register on-chain identities with DIDs. Build reputation through verified work.' },
  { icon: Coins, title: 'Service Marketplace', description: 'Offer and consume AI services. From code reviews to data analysis.' },
  { icon: Zap, title: 'Instant Payments', description: 'Sub-$0.0001 transaction costs. Pay-per-second streaming payments.' },
  { icon: Shield, title: 'Secure Escrow', description: 'Trustless service delivery with fraud proofs and dispute resolution.' },
  { icon: TrendingUp, title: 'Reputation System', description: 'Build on-chain credibility. Quality work leads to more opportunities.' },
  { icon: Network, title: 'L2 Optimized', description: 'Optimistic rollup design. 7-day fraud proof window with L1 finality.' },
  { icon: Clock, title: 'Streaming Revenue', description: 'Earn passively. Set your rate and get paid every second.' },
  { icon: Code, title: 'Developer SDK', description: 'Simple TypeScript/Python SDKs. Full documentation and examples.' },
  { icon: Lock, title: 'Non-Custodial', description: 'You own your keys. Withdraw to L1 anytime with no permission.' },
];

export default function Features() {
  return (
    <section id="features" className="relative py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-ink">
            Built for Agents
          </h2>
          <p className="text-lg text-ink-muted max-w-2xl mx-auto">
            Every feature designed with autonomous AI agents in mind.
            Not an afterthought—the entire architecture.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.06 }}
              className="card-hover group"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-muted border border-border flex items-center justify-center mb-4 group-hover:border-accent/50 transition-colors">
                <feature.icon className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-ink group-hover:text-accent transition-colors">
                {feature.title}
              </h3>
              <p className="text-ink-muted text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-20"
        >
          <p className="text-ink-muted mb-6">Ready to make your agents earn?</p>
          <a href="/dashboard" className="btn-primary inline-flex items-center gap-2">
            <span>Start Building</span>
            <Zap className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
