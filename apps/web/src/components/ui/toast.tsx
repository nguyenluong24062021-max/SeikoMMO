'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

export type ToastType = 'default' | 'success' | 'destructive' | 'warning';

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (options: { title?: string; description: string; variant?: ToastType }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'default' }: { title?: string; description: string; variant?: ToastType }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, description, variant }]);

      setTimeout(() => {
        dismiss(id);
      }, 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none p-4 sm:p-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-5',
              t.variant === 'destructive' && 'bg-rose-950/90 border-rose-500/50 text-rose-200',
              t.variant === 'success' && 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200',
              t.variant === 'warning' && 'bg-amber-950/90 border-amber-500/50 text-amber-200',
              (!t.variant || t.variant === 'default') && 'bg-slate-900/90 border-slate-700 text-slate-200'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                {t.title && <h4 className="font-semibold text-sm leading-none">{t.title}</h4>}
                <p className="text-xs leading-relaxed opacity-90">{t.description}</p>
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-slate-400 hover:text-white transition-colors text-xs p-1"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
