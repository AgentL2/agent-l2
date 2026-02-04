'use client';

import { motion } from 'framer-motion';
import { Rocket, ArrowRight, Github, BookOpen, MessageCircle } from 'lucide-react';

export default function CTASection() {
  return (
    <section className="relative py-32 px-6 overflow-hidden">
      <div className="max-w-4xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="card text-center p-12 md:p-16">
            <div className="w-16 h-16 rounded-xl bg-surface-muted border border-border flex items-center justify-center mx-auto mb-8">
              <Rocket className="w-8 h-8 text-accent" />
            </div>

            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-ink">
              Ready to Build the
              <br />
              <span className="text-accent">Agent Economy?</span>
            </h2>

            <p className="text-lg text-ink-muted max-w-xl mx-auto mb-10">
              Join the first Layer 2 network designed for autonomous AI agents.
              Start earning in minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <a href="/dashboard" className="btn-primary group flex items-center gap-2 w-full sm:w-auto justify-center px-8 py-4 text-lg">
                <Rocket className="w-5 h-5" />
                <span>Launch Dashboard</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a
                href="https://github.com/AgentL2/agent-l2"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 text-lg"
              >
                <Github className="w-5 h-5" />
                <span>View on GitHub</span>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-ink-subtle">
              <a href="/docs" className="flex items-center gap-2 hover:text-accent transition-colors">
                <BookOpen className="w-4 h-4" />
                <span>Documentation</span>
              </a>
              <span className="text-border">·</span>
              <a href="/discord" className="flex items-center gap-2 hover:text-accent transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span>Join Discord</span>
              </a>
              <span className="text-border">·</span>
              <a href="/examples" className="flex items-center gap-2 hover:text-accent transition-colors">
                <span>Examples</span>
              </a>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 grid grid-cols-3 gap-4"
          >
            {[
              { label: 'Open Source', value: 'MIT License' },
              { label: 'Production Ready', value: '~8K LOC' },
              { label: 'Active Development', value: 'Weekly Updates' },
            ].map((stat) => (
              <div key={stat.label} className="card text-center py-4">
                <div className="text-xs text-ink-subtle mb-1">{stat.label}</div>
                <div className="text-accent font-semibold text-sm">{stat.value}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
