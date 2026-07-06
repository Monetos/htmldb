import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import {
  type AmpelStatus,
  muscleAmpelFromWeeks,
  weeklyMuscleVolume,
} from '../../lib/progression';
import { MUSCLE_GROUP_LABELS, type Exercise, type MuscleGroup, type SetEntry } from '../../db/schema';
import { Card } from '../../components/Card';

const EMPTY_SETS: SetEntry[] = [];
const EMPTY_EXERCISES: Exercise[] = [];

const ALL_MUSCLES: MuscleGroup[] = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];

const STATUS_STYLES: Record<AmpelStatus, { dot: string; label: string }> = {
  below: { dot: 'bg-rose-500', label: 'unter Schnitt' },
  in_range: { dot: 'bg-emerald-500', label: 'im Bereich' },
  above: { dot: 'bg-blue-500', label: 'über Schnitt' },
  no_baseline: { dot: 'bg-slate-300', label: '—' },
};

export function MuscleVolumeAmpel() {
  const setsQuery = useLiveQuery(() => db.sets.toArray(), []);
  const exercisesQuery = useLiveQuery(() => db.exercises.toArray(), []);
  const sets = setsQuery ?? EMPTY_SETS;
  const exercises = exercisesQuery ?? EMPTY_EXERCISES;

  const exMap = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const ex of exercises) m.set(ex.id, ex);
    return m;
  }, [exercises]);

  const ampel = useMemo(() => {
    const buckets = weeklyMuscleVolume(sets, exMap, Date.now(), 5);
    return muscleAmpelFromWeeks(buckets, ALL_MUSCLES)
      // Sort: rows with current activity first (any volume or sets), then by name.
      .sort((a, b) => {
        const aActive = a.currentSets > 0 || a.currentVolume > 0 || a.baselineVolume > 0 ? 1 : 0;
        const bActive = b.currentSets > 0 || b.currentVolume > 0 || b.baselineVolume > 0 ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return MUSCLE_GROUP_LABELS[a.muscle].localeCompare(MUSCLE_GROUP_LABELS[b.muscle]);
      });
  }, [sets, exMap]);

  const maxVolume = useMemo(
    () => Math.max(1, ...ampel.map((a) => Math.max(a.currentVolume, a.baselineVolume))),
    [ampel],
  );

  const hasActivity = ampel.some((a) => a.currentSets > 0 || a.currentVolume > 0);

  return (
    <Card>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h3 className="text-sm font-semibold">Diese Woche</h3>
          <p className="text-xs text-slate-500">Vergleich zum gleitenden 4-Wochen-Mittel</p>
        </div>
        <Legend />
      </div>

      {!hasActivity ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
          Diese Woche noch keine Sätze geloggt.
        </p>
      ) : (
        <ul className="space-y-1">
          {ampel.map((row) => {
            const style = STATUS_STYLES[row.status];
            const widthCurrent = Math.min(100, (row.currentVolume / maxVolume) * 100);
            const widthBaseline = Math.min(100, (row.baselineVolume / maxVolume) * 100);
            // Skip muscle groups with no activity at all.
            if (row.currentSets === 0 && row.currentVolume === 0 && row.baselineVolume === 0) {
              return null;
            }
            return (
              <li
                key={row.muscle}
                className="grid grid-cols-[7rem_1fr_auto] items-center gap-2 py-1"
              >
                <span className="flex items-center gap-2 text-xs">
                  <span
                    aria-label={style.label}
                    className={`inline-block h-2 w-2 rounded-full ${style.dot}`}
                  />
                  {MUSCLE_GROUP_LABELS[row.muscle]}
                </span>
                <div className="relative h-3 rounded-full bg-slate-100 dark:bg-slate-900/50">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-slate-300 dark:bg-slate-700"
                    style={{ width: `${widthBaseline}%` }}
                    aria-hidden
                  />
                  <div
                    className={`absolute inset-y-0 left-0 rounded-full ${
                      row.status === 'below'
                        ? 'bg-rose-500'
                        : row.status === 'above'
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${widthCurrent}%` }}
                    aria-hidden
                  />
                </div>
                <span className="text-right text-xs tabular-nums text-slate-500">
                  {row.currentSets}× · {Math.round(row.currentVolume)} kg
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-rose-500" /> unter
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> ok
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-blue-500" /> über
      </span>
    </div>
  );
}
