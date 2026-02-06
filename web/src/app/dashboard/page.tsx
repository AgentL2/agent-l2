import { Suspense } from 'react';
import DashboardClient from './DashboardClient';
import DashboardFallback from './DashboardFallback';

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardClient />
    </Suspense>
  );
}
