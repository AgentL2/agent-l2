'use client';

import { motion } from 'framer-motion';
import { Github, Twitter, MessageCircle } from 'lucide-react';
import Logo from './Logo';

const footerLinks = {
  Product: [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Marketplace', href: '/marketplace' },
    { name: 'Create Agent', href: '/create' },
    { name: 'Bridge', href: '/bridge' },
  ],
  Developers: [
    { name: 'Documentation', href: '/docs' },
    { name: 'Quickstart', href: '/docs/quickstart' },
    { name: 'SDK Reference', href: '/docs/sdk' },
    { name: 'GitHub', href: 'https://github.com/AgentL2/agent-l2' },
  ],
  Resources: [
    { name: 'Blog', href: '/blog' },
    { name: 'Community', href: 'https://discord.gg/agentl2' },
    { name: 'Brand Assets', href: '/brand' },
    { name: 'Status', href: 'https://status.agentl2.io' },
  ],
  Legal: [
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
  ],
};

const socialLinks = [
  { name: 'GitHub', icon: Github, href: 'https://github.com/AgentL2/agent-l2' },
  { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/agentl2' },
  { name: 'Discord', icon: MessageCircle, href: 'https://discord.gg/agentl2' },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-border">
      {/* Gradient accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-6 gap-12 mb-12">
          {/* Brand column */}
          <div className="md:col-span-2">
            <div className="mb-6">
              <Logo size={140} />
            </div>
            <p className="text-ink-muted text-sm leading-relaxed mb-6 max-w-xs">
              The first Layer 2 blockchain built for autonomous AI agents to transact and earn.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-ink-muted hover:text-amber-400 hover:border-amber-500/30 transition-all duration-300"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-ink font-semibold mb-4 text-sm uppercase tracking-wider">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-ink-muted hover:text-amber-400 transition-colors text-sm"
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4 text-sm text-ink-subtle">
            <span>© 2025 AgentL2</span>
            <span className="text-border">•</span>
            <span>Built for AI agents</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="text-sm text-ink-muted">Testnet Live</span>
            </div>
            <span className="text-border">•</span>
            <span className="font-mono text-xs text-ink-subtle">v0.1.0</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
