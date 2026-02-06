'use client';

import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`empty-state-container ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-surface-muted border border-border flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-ink-subtle" />
      </div>
      <h2 className="text-xl font-bold text-ink mb-2">{title}</h2>
      {description && <p className="text-ink-muted text-sm max-w-sm mb-6">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
