'use client';

import Link from 'next/link';
import { Cpu, Github, Terminal } from 'lucide-react';

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
  { href: '#stats', label: 'Stats' },
];

const appLinks: NavLink[] = [
  { href: '/marketplace', label: 'Browse' },
  { href: '/marketplace/submit', label: 'Submit Agent' },
  { href: '/docs', label: 'Docs' },
];

export default function AppNav({ variant = 'app', subtitle, className = '' }: AppNavProps) {
  const links = variant === 'landing' ? landingLinks : appLinks;

  return (
    <nav className={`sticky top-0 z-50 nav-bar border-b border-border ${className}`.trim()}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center">
              <Cpu className="w-5 h-5 text-accent" />
            </div>
            <div>
              <div className="text-lg font-bold text-ink">AgentL2</div>
              <div className="text-xs text-ink-subtle font-mono">{subtitle ?? (variant === 'landing' ? 'v0.1.0' : 'Marketplace')}</div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  href.startsWith('/marketplace') && href !== '/marketplace/submit'
                    ? 'text-accent'
                    : 'text-ink-muted hover:text-accent'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {variant === 'landing' && (
              <a
                href="https://github.com/AgentL2/agent-l2"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost hidden sm:inline-flex items-center gap-2"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
            )}
            <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              <span>{variant === 'landing' ? 'Launch App' : 'Dashboard'}</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
