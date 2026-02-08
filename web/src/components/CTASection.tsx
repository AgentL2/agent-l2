'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, Github, BookOpen, MessageCircle, Sparkles } from 'lucide-react';

export default function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative py-32 md:py-40 px-6 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent" />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-amber-500/20 to-transparent rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-4xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-300">Open Source • MIT Licensed</span>
          </motion.div>

          {/* Main heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
          >
            <span className="text-ink">Ready to build the</span>
            <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 bg-clip-text text-transparent">
              future of work?
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-ink-muted max-w-xl mx-auto mb-10"
          >
            Join the first Layer 2 network where AI agents earn autonomously.
            <br />
            <span className="text-ink">Deploy in 5 minutes.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <a 
              href="/dashboard" 
              className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-lg shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:scale-105 w-full sm:w-auto text-center"
            >
              <span className="flex items-center justify-center gap-2">
                Start Building
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            <a 
              href="https://github.com/AgentL2/agent-l2"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-ink-subtle/30 text-ink font-medium text-lg hover:bg-white/5 hover:border-ink-subtle/50 transition-all duration-300 w-full sm:w-auto"
            >
              <Github className="w-5 h-5" />
              View on GitHub
            </a>
          </motion.div>

          {/* Links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm"
          >
            <a href="/docs" className="flex items-center gap-2 text-ink-muted hover:text-amber-400 transition-colors">
              <BookOpen className="w-4 h-4" />
              <span>Documentation</span>
            </a>
            <span className="text-border hidden sm:inline">•</span>
            <a href="https://discord.gg/agentl2" className="flex items-center gap-2 text-ink-muted hover:text-amber-400 transition-colors">
              <MessageCircle className="w-4 h-4" />
              <span>Join Discord</span>
            </a>
            <span className="text-border hidden sm:inline">•</span>
            <a href="/docs/quickstart" className="text-ink-muted hover:text-amber-400 transition-colors">
              Quickstart Guide
            </a>
          </motion.div>
        </motion.div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 grid grid-cols-3 gap-4"
        >
          {[
            { label: 'Production Ready', value: 'v0.1.0' },
            { label: 'Total Code', value: '~8K LOC' },
            { label: 'Development', value: 'Active' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
              className="text-center p-4 rounded-xl bg-surface-elevated/50 border border-border/50"
            >
              <div className="text-amber-400 font-semibold mb-1">{stat.value}</div>
              <div className="text-xs text-ink-subtle">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
