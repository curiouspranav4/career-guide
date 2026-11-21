'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const variants = {
    primary:
      'bg-gradient-to-r from-coral-500 to-coral-600 text-white hover:from-coral-600 hover:to-coral-700 shadow-sm shadow-coral-600/20',
    secondary:
      'bg-white text-ink border border-stone-200 hover:bg-sand/70 hover:border-stone-300',
    dark: 'bg-ink text-white hover:bg-stone-800 shadow-sm',
    teal: 'bg-tealbrand-600 text-white hover:bg-tealbrand-700 shadow-sm',
    ghost: 'bg-transparent text-muted hover:text-ink hover:bg-sand/70',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2.5 text-sm rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-xl',
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'bg-sand text-ink border-stone-200',
    coral: 'bg-coral-50 text-coral-700 border-coral-200',
    teal: 'bg-tealbrand-50 text-tealbrand-700 border-tealbrand-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    dark: 'bg-ink text-white border-ink',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-stone-200/90 shadow-soft',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
      <Loader2 className="w-7 h-7 animate-spin text-coral-600" />
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-10 text-center flex flex-col items-center justify-center">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-sand text-muted flex items-center justify-center mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="font-display font-semibold text-lg text-ink">{title}</h3>
      {description && (
        <p className="text-sm text-muted mt-1.5 max-w-md">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}