'use client';

import Link from 'next/link';
import { Github, ChevronRight } from 'lucide-react';
import DocsSidebar from './DocsSidebar';
import Logo from '@/components/Logo';

interface DocsLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export default function DocsLayout({ children, breadcrumbs }: DocsLayoutProps) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Top Navigation - Fixed */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-sm border-b border-border h-14">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} />
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
      </header>

      {/* Content wrapper with top padding for fixed header */}
      <div className="pt-14 flex">
        {/* Sidebar */}
        <DocsSidebar />

        {/* Main Content */}
        <main className="flex-1 min-w-0 lg:ml-0">
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
