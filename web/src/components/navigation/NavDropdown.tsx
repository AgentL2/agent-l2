'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface NavItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  description?: string;
  external?: boolean;
  onClick?: () => void;
}

interface NavDropdownProps {
  label: string;
  items: NavItem[];
  isActive?: boolean;
}

export default function NavDropdown({ label, items, isActive }: NavDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  return (
    <div
      ref={dropdownRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-all ${
          isActive || isOpen
            ? 'text-accent bg-accent-muted'
            : 'text-ink-muted hover:text-ink hover:bg-surface-muted'
        }`}
      >
        <span>{label}</span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full left-0 mt-2 w-64 origin-top-left z-50"
          >
            <div className="bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="p-2">
                {items.map((item, index) => (
                  item.href ? (
                    <Link
                      key={index}
                      href={item.href}
                      target={item.external ? '_blank' : undefined}
                      rel={item.external ? 'noopener noreferrer' : undefined}
                      onClick={() => setIsOpen(false)}
                      className="flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-surface-muted transition-all group"
                    >
                      {item.icon && (
                        <div className="w-9 h-9 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center flex-shrink-0 group-hover:border-accent/40 transition-all">
                          <item.icon className="w-4 h-4 text-accent" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ink group-hover:text-accent transition-colors">
                          {item.label}
                        </div>
                        {item.description && (
                          <div className="text-xs text-ink-subtle mt-0.5 line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <button
                      key={index}
                      onClick={() => {
                        item.onClick?.();
                        setIsOpen(false);
                      }}
                      className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-surface-muted transition-all group text-left"
                    >
                      {item.icon && (
                        <div className="w-9 h-9 rounded-lg bg-accent-muted border border-accent/20 flex items-center justify-center flex-shrink-0 group-hover:border-accent/40 transition-all">
                          <item.icon className="w-4 h-4 text-accent" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-ink group-hover:text-accent transition-colors">
                          {item.label}
                        </div>
                        {item.description && (
                          <div className="text-xs text-ink-subtle mt-0.5 line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
