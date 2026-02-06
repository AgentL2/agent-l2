'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: ReactNode;
  children?: ReactNode;
  /** Use icon trigger instead of wrapping children */
  iconTrigger?: boolean;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, iconTrigger, side = 'top', className = '' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    if (side === 'top') {
      setCoords({ x: rect.left + rect.width / 2, y: rect.top - gap });
    } else if (side === 'bottom') {
      setCoords({ x: rect.left + rect.width / 2, y: rect.bottom + gap });
    } else if (side === 'left') {
      setCoords({ x: rect.left - gap, y: rect.top + rect.height / 2 });
    } else {
      setCoords({ x: rect.right + gap, y: rect.top + rect.height / 2 });
    }
  };

  useEffect(() => {
    if (!visible) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [visible, side]);

  const trigger = iconTrigger ? (
    <span
      ref={triggerRef}
      role="img"
      aria-label="Help"
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-muted border border-border text-ink-muted hover:text-accent hover:border-accent/50 cursor-help transition-colors shrink-0"
      onMouseEnter={() => { updatePosition(); setVisible(true); }}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => { updatePosition(); setVisible(true); }}
      onBlur={() => setVisible(false)}
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </span>
  ) : (
    <span
      ref={triggerRef}
      className="inline-flex items-center"
      onMouseEnter={() => { updatePosition(); setVisible(true); }}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => { updatePosition(); setVisible(true); }}
      onBlur={() => setVisible(false)}
    >
      {children}
    </span>
  );

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {!iconTrigger && children}
      {iconTrigger && trigger}
      {visible && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className={`
            fixed z-[100] max-w-[280px] px-3 py-2 text-sm font-normal text-ink bg-surface-elevated border border-border rounded-lg shadow-card
            ${side === 'top' ? 'origin-bottom -translate-x-1/2 -translate-y-full' : ''}
            ${side === 'bottom' ? 'origin-top -translate-x-1/2' : ''}
            ${side === 'left' ? 'origin-right -translate-x-full -translate-y-1/2' : ''}
            ${side === 'right' ? 'origin-left -translate-y-1/2' : ''}
          `}
          style={{
            left: coords.x,
            top: coords.y,
          }}
          onMouseEnter={() => setVisible(true)}
          onMouseLeave={() => setVisible(false)}
        >
          {content}
        </div>
      )}
      {iconTrigger && children}
    </span>
  );
}

/** Label with optional tooltip (help icon after label text) */
export function LabelWithTooltip({
  label,
  tooltip,
  htmlFor,
  className = '',
}: {
  label: string;
  tooltip: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-ink-muted mb-2 ${className}`}>
      <span className="inline-flex items-center gap-2">
        <span>{label}</span>
        <Tooltip content={tooltip} iconTrigger side="top" />
      </span>
    </label>
  );
}
