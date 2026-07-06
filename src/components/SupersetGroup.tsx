import type { ReactNode } from 'react';
import { Card } from './Card';

interface SupersetGroupProps {
  label: string;
  headerAction?: ReactNode;
  children: ReactNode;
}

/**
 * Shared visual wrapper for a superset/circuit round, used both when
 * defining groups (RoutineFormPage) and while running them (ActiveWorkoutPage).
 */
export function SupersetGroup({ label, headerAction, children }: SupersetGroupProps) {
  return (
    <Card className="!p-0 border-l-4 border-l-brand-500">
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
          {label}
        </div>
        {headerAction}
      </div>
      <div className="divide-y divide-slate-200 dark:divide-slate-700">{children}</div>
    </Card>
  );
}
