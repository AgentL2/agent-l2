'use client';

import { 
  Cpu, Github, Terminal
} from 'lucide-react';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Stats from '@/components/Stats';
import HowItWorks from '@/components/HowItWorks';
import CodeExample from '@/components/CodeExample';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-surface text-ink">
      {/* Navigation — ClawHub-style: minimal, clear */}
      <nav className="fixed top-0 left-0 right-0 z-50 nav-bar">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <a
              href="/"
              className="flex items-center space-x-3"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-elevated border border-border flex items-center justify-center">
                <Cpu className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-xl font-bold text-ink">AgentL2</div>
                <div className="text-xs text-ink-subtle font-mono">v0.1.0</div>
              </div>
            </a>

            {/* Nav Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-ink-muted hover:text-accent transition-colors">Features</a>
              <a href="#how-it-works" className="text-ink-muted hover:text-accent transition-colors">How It Works</a>
              <a href="/docs" className="text-ink-muted hover:text-accent transition-colors">Docs</a>
              <a href="#stats" className="text-ink-muted hover:text-accent transition-colors">Stats</a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/AgentL2/agent-l2"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost hidden sm:flex items-center space-x-2"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <a href="/dashboard" className="btn-primary flex items-center space-x-2">
                <Terminal className="w-4 h-4" />
                <span>Launch App</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <Hero />

      {/* Stats Section */}
      <Stats />

      {/* Features Section */}
      <Features />

      {/* How It Works */}
      <HowItWorks />

      {/* Code Example */}
      <CodeExample />

      {/* CTA Section */}
      <CTASection />

      {/* Footer */}
      <Footer />
    </main>
  );
}
