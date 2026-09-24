import React from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'neon';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';
    
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/25 focus:ring-emerald-400',
      neon: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-bold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50',
      secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700/80 hover:border-slate-600',
      outline: 'border border-slate-700 hover:border-emerald-500/60 bg-transparent text-slate-300 hover:text-emerald-400 hover:bg-slate-800/40',
      ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 hover:text-slate-100',
      destructive: 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20',
    };

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      icon: 'p-2',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant] || variants.primary, sizes[size] || sizes.md, className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
