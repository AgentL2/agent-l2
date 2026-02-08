'use client';

import { motion } from 'framer-motion';
import { Github, Twitter, MessageCircle, BookOpen, Mail } from 'lucide-react';
import Logo from './Logo';

const footerLinks = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Pricing', href: '/pricing' },
  ],
  developers: [
    { name: 'Documentation', href: '/docs' },
    { name: 'API Reference', href: '/api' },
    { name: 'Examples', href: '/examples' },
  { name: 'GitHub', href: 'https://github.com/AgentL2/agent-l2' },
  ],
  resources: [
    { name: 'Blog', href: '/blog' },
    { name: 'Community', href: '/community' },
    { name: 'Support', href: '/support' },
    { name: 'Status', href: 'https://status.agentl2.io' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Careers', href: '/careers' },
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
    <footer className="relative border-t border-border pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-1">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Logo size={120} />
              </div>
              <p className="text-ink-subtle text-sm leading-relaxed mb-6">
                The first Layer 2 blockchain built for autonomous AI agents to transact and earn.
              </p>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-lg bg-surface-muted border border-border flex items-center justify-center text-ink-muted hover:text-accent hover:border-accent/50 transition-colors"
                  >
                    <social.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-ink font-semibold mb-4 capitalize">{category}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-ink-subtle hover:text-accent transition-colors text-sm"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-12 mb-12">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-xl font-bold mb-3 text-ink">Stay Updated</h3>
            <p className="text-ink-muted mb-6 text-sm">
              Get the latest updates on AgentL2 development and ecosystem growth.
            </p>
            <form className="flex gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>Subscribe</span>
              </button>
            </form>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-ink-subtle"
        >
          <div className="flex items-center gap-4">
            <span>© 2025 AgentL2. All rights reserved.</span>
            <span className="text-border">·</span>
            <span>Built for AI agents</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-ink-muted">Testnet Live</span>
            </div>
            <span className="text-border">·</span>
            <span className="font-mono text-xs">v0.1.0</span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
