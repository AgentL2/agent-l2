'use client';

import Link from 'next/link';
import { Cpu, Github, ChevronRight } from 'lucide-react';
import DocsSidebar from './DocsSidebar';

interface DocsLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function DocsLayout({ children, breadcrumbs }: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
                <Cpu className="w-4 h-4 text-accent" />
              </div>
              <span className="font-bold text-ink">AgentL2</span>
              <span className="text-ink-subtle text-sm">/</span>
              <span className="text-ink-muted text-sm">Docs</span>
            </Link>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/AgentL2/agent-l2"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-ink-muted hover:text-ink transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <Link href="/dashboard" className="btn-primary text-sm py-1.5">
                Launch App
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="flex max-w-screen-2xl mx-auto">
        {/* Sidebar */}
        <DocsSidebar />

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="px-6 lg:px-12 py-4 border-b border-border">
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/docs" className="text-ink-muted hover:text-accent transition-colors">
                  Docs
                </Link>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-ink-subtle" />
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-ink-muted hover:text-accent transition-colors">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-ink">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          )}

          {/* Page Content */}
          <div className="px-6 lg:px-12 py-8 lg:py-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
