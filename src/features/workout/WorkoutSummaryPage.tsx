import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Flame, Trophy } from 'lucide-react';
import { db } from '../../db/database';
import type { PrCategory } from '../../lib/progression';
import { streakDays } from '../../lib/progression';
import { formatWorkoutLength } from '../../lib/format';
import { formatWeightInUnit } from '../../lib/units';
import { useWeightUnit } from '../../hooks/useWeightUnit';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Celebration } from '../../components/Celebration';
import { computeSessionPrSummary, totalVolumeKg } from './workoutLib';

const PR_CATEGORY_LABELS: Record<PrCategory, string> = {
  heaviest: 'Heavy',
  heaviestFor5: '≥5 Wdh',
  best1Rm: '1RM',
};

export function WorkoutSummaryPage() {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  const { unit } = useWeightUnit();

  const workout = useLiveQuery(
    () => (workoutId ? db.workouts.get(workoutId) : undefined),
    [workoutId],
  );
  const sets = useLiveQuery(
    () => (workoutId ? db.sets.where('workoutId').equals(workoutId).toArray() : []),
    [workoutId],
  ) ?? [];
  const prSummary = useLiveQuery(
    () => (workoutId ? computeSessionPrSummary(workoutId) : undefined),
    [workoutId],
  );
  const allWorkouts = useLiveQuery(() => db.workouts.toArray(), []) ?? [];

  const otherWorkouts = workoutId ? allWorkouts.filter((w) => w.id !== workoutId) : allWorkouts;
  const newStreak = streakDays(allWorkouts, Date.now());
  const oldStreak = streakDays(otherWorkouts, Date.now());
  const streakIncreased = newStreak > oldStreak;

  const firedRef = useRef(false);
  const [celebrate, setCelebrate] = useState(false);
  const [variant, setVariant] = useState<'pr' | 'streak' | 'generic'>('generic');

  useEffect(() => {
    if (firedRef.current || prSummary === undefined || allWorkouts.length === 0) return;
    firedRef.current = true;
    if (prSummary.hasAnyPr) {
      setVariant('pr');
      setCelebrate(true);
    } else if (streakIncreased) {
      setVariant('streak');
      setCelebrate(true);
    }
  }, [prSummary, streakIncreased, allWorkouts.length]);

  if (!workout) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8 text-center text-sm text-slate-500">
        Workout nicht gefunden.
      </div>
    );
  }

  const volumeKg = totalVolumeKg(sets);

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <AppHeader title="Zusammenfassung" />
      <div className="relative mt-4 overflow-hidden rounded-2xl">
        <Celebration trigger={celebrate} onComplete={() => setCelebrate(false)} variant={variant} />
        <Card className="p-4">
          {workout.routineName ? (
            <div className="mb-1 text-sm text-slate-500">{workout.routineName}</div>
          ) : null}
          <div className="text-sm text-slate-500">
            {new Date(workout.startedAt).toLocaleDateString('de-DE')}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
            <Stat label="Dauer" value={formatWorkoutLength(workout.startedAt, workout.finishedAt)} />
            <Stat label="Volumen" value={`${formatWeightInUnit(volumeKg, unit)} ${unit}`} />
            <Stat label="Sätze" value={String(sets.length)} />
            <Stat
              label="Streak"
              value={`${newStreak} ${newStreak === 1 ? 'Tag' : 'Tage'}`}
              icon={<Flame className="h-4 w-4 text-amber-500" />}
            />
          </div>
        </Card>
      </div>

      {prSummary && prSummary.hasAnyPr ? (
        <Card className="mt-4 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Neue Rekorde
          </h2>
          <ul className="space-y-2">
            {prSummary.entries.map((entry) => (
              <li key={entry.exerciseId} className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  {entry.exerciseName}
                </span>
                <span className="flex flex-wrap justify-end gap-1">
                  {entry.categories.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                    >
                      {PR_CATEGORY_LABELS[c]}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Button className="mt-4 w-full" onClick={() => navigate('/', { replace: true })}>
        Fertig
      </Button>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 flex items-center justify-center gap-1 text-lg font-semibold tabular-nums">
        {icon}
        {value}
      </div>
    </div>
  );
}
