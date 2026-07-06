import type { ReactNode } from 'react';

interface ToastProps {
  children: ReactNode;
  role?: string;
  onDismiss?: () => void;
}

/**
 * Shared floating status toast, extracted from UpdatePrompt.tsx (previously
 * a local function there). Restyled onto the new shadow-modal + rounded-3xl
 * conventions used by the rest of the redesigned surfaces.
 */
export function Toast({ children, role, onDismiss }: ToastProps) {
  return (
    <div
      role={role}
      className="fixed bottom-20 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-3xl border border-slate-200 bg-white p-3 shadow-modal dark:border-slate-700 dark:bg-slate-900 dark:shadow-none dark:ring-1 dark:ring-white/5"
    >
      <div className="flex items-center gap-2">
        {children}
        {onDismiss ? (
          <button
            type="button"
            aria-label="Schließen"
            onClick={onDismiss}
            className="ml-1 text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
