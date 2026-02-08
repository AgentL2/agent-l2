'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Github, Terminal, Menu, X } from 'lucide-react';
import Logo from './Logo';

export type AppNavVariant = 'landing' | 'app';

interface NavLink {
  href: string;
  label: string;
}

interface AppNavProps {
  variant?: AppNavVariant;
  subtitle?: string;
  className?: string;
}

const landingLinks: NavLink[] = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How It Works' },
  { href: '/docs', label: 'Docs' },
  { href: '/marketplace', label: 'Marketplace' },
];

const appLinks: NavLink[] = [
  { href: '/marketplace', label: 'Browse' },
  { href: '/marketplace/submit', label: 'Submit Agent' },
  { href: '/docs', label: 'Docs' },
];

export default function AppNav({ variant = 'app', className = '' }: AppNavProps) {
  const links = variant === 'landing' ? landingLinks : appLinks;
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-surface/80 backdrop-blur-lg border-b border-border/50' 
            : 'bg-transparent'
        } ${className}`.trim()}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Logo size={100} />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-white/5 transition-all"
                >
                  {label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {variant === 'landing' && (
                <a
                  href="https://github.com/AgentL2/agent-l2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-ink-muted hover:text-ink hover:bg-white/5 transition-all"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub</span>
                </a>
              )}
              <Link 
                href="/dashboard" 
                className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all hover:scale-105"
              >
                <Terminal className="w-4 h-4" />
                <span>Launch App</span>
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-white/5 transition-all"
              >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-16 z-40 md:hidden bg-surface/95 backdrop-blur-lg border-b border-border"
          >
            <div className="px-6 py-4 space-y-1">
              {links.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-lg text-ink hover:bg-white/5 transition-colors"
                >
                  {label}
                </Link>
              ))}
              <div className="pt-4 space-y-2">
                <a
                  href="https://github.com/AgentL2/agent-l2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg text-ink-muted hover:bg-white/5 transition-colors"
                >
                  <Github className="w-5 h-5" />
                  <span>GitHub</span>
                </a>
                <Link 
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold"
                >
                  <Terminal className="w-5 h-5" />
                  <span>Launch App</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
