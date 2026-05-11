import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Flame } from 'lucide-react';
import { db } from '../../db/database';
import { streakDays } from '../../lib/progression';
import type { Workout } from '../../db/schema';

const EMPTY_WORKOUTS: Workout[] = [];

export function StreakBanner() {
  const workoutsQuery = useLiveQuery(() => db.workouts.toArray(), []);
  const workouts = workoutsQuery ?? EMPTY_WORKOUTS;

  const streak = useMemo(() => streakDays(workouts, Date.now()), [workouts]);
  const finishedCount = useMemo(() => workouts.filter((w) => w.finishedAt).length, [workouts]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 dark:border-slate-700 dark:from-amber-900/20 dark:to-orange-900/20">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/40">
          <Flame className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wide text-slate-500">Streak</div>
          <div className="text-2xl font-semibold tabular-nums">
            {streak} {streak === 1 ? 'Tag' : 'Tage'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-slate-500">Workouts</div>
          <div className="text-2xl font-semibold tabular-nums">{finishedCount}</div>
        </div>
      </div>
    </div>
  );
}
