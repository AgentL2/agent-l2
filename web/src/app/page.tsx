'use client';

import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Stats from '@/components/Stats';
import HowItWorks from '@/components/HowItWorks';
import CodeExample from '@/components/CodeExample';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';
import AppNav from '@/components/AppNav';

export default function Home() {
  return (
    <main className="min-h-screen bg-surface text-ink">
      <AppNav variant="landing" subtitle="v0.1.0" className="fixed top-0 left-0 right-0" />

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
