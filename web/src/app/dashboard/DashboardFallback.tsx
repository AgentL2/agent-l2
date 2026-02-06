'use client';

import DashboardNav from '@/components/dashboard/DashboardNav';

export default function DashboardFallback() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <DashboardNav
        activeTab="overview"
        setActiveTab={() => {}}
        isConnected={false}
        address={null}
      />
      <div className="max-w-[1800px] mx-auto px-6 py-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-ink-muted">Loading…</div>
      </div>
    </div>
  );
}
