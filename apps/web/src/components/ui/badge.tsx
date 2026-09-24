import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'digital' | 'tool' | 'seeding' | 'success' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'neutral',
  children,
  ...props
}) => {
  const variants: Record<BadgeVariant, string> = {
    digital: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    tool: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
    seeding: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
    danger: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    neutral: 'bg-slate-800 text-slate-300 border border-slate-700',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase',
        variants[variant] || variants.neutral,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
