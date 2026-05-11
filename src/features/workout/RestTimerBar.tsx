import { Plus, Minus, X } from 'lucide-react';
import { useRestTimer } from '../../store/restTimer';
import { formatDuration } from '../../lib/format';

export function RestTimerBar() {
  const remaining = useRestTimer((s) => s.remaining);
  const total = useRestTimer((s) => s.totalSeconds);
  const expiresAt = useRestTimer((s) => s.expiresAt);
  const add = useRestTimer((s) => s.add);
  const skip = useRestTimer((s) => s.skip);

  if (expiresAt === null) return null;

  const progress = total > 0 ? Math.min(1, Math.max(0, 1 - remaining / total)) : 1;

  return (
    <div
      role="status"
      aria-label="Satzpause"
      className="sticky top-14 z-10 mx-auto mt-2 max-w-xl rounded-2xl border border-brand-500 bg-brand-50 p-3 shadow-sm dark:bg-brand-700/20"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Satzpause
          </div>
          <div className="font-mono text-3xl font-semibold tabular-nums text-brand-700 dark:text-brand-300">
            {formatDuration(remaining)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="30 Sekunden abziehen"
            onClick={() => add(-30)}
            className="rounded-xl border border-brand-500 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700/30"
          >
            <Minus className="h-4 w-4" />
            30s
          </button>
          <button
            type="button"
            aria-label="30 Sekunden hinzufügen"
            onClick={() => add(30)}
            className="rounded-xl border border-brand-500 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:text-brand-300 dark:hover:bg-brand-700/30"
          >
            <Plus className="h-4 w-4" />
            30s
          </button>
          <button
            type="button"
            aria-label="Pause beenden"
            onClick={skip}
            className="rounded-xl bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-700/40">
        <div
          className="h-full bg-brand-500 transition-[width] duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}
