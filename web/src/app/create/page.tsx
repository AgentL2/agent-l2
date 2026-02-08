import { Suspense } from 'react';
import CreateClient from './CreateClient';

export default function CreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    }>
      <CreateClient />
    </Suspense>
  );
}
