import type { ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../../db/database';
import { AppHeader } from '../../components/AppHeader';
import { formatWorkoutLength } from '../../lib/format';
import { totalVolumeKg } from '../workout/workoutLib';
import type { SetEntry, Workout } from '../../db/schema';
import { StreakBanner } from './StreakBanner';
import { MuscleVolumeAmpel } from './MuscleVolumeAmpel';
import { MuscleTrendChart } from './MuscleTrendChart';
import { PrTable } from './PrTable';
import { WorkoutCalendar } from './WorkoutCalendar';

interface WorkoutWithStats {
  workout: Workout;
  setCount: number;
  volumeKg: number;
}

async function loadRecentWorkoutStats(limit: number): Promise<WorkoutWithStats[]> {
  const workouts = await db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((w) => Boolean(w.finishedAt))
    .limit(limit)
    .toArray();
  const result: WorkoutWithStats[] = [];
  for (const w of workouts) {
    const sets: SetEntry[] = await db.sets.where('workoutId').equals(w.id).toArray();
    result.push({
      workout: w,
      setCount: sets.length,
      volumeKg: totalVolumeKg(sets),
    });
  }
  return result;
}

export function ProgressPage() {
  const entries = useLiveQuery(() => loadRecentWorkoutStats(10), []) ?? [];

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Statistik" />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 pb-24 pt-4">
        <StreakBanner />
        <MuscleVolumeAmpel />
        <MuscleTrendChart />
        <Section title="Personal Records">
          <PrTable />
        </Section>
        <Section title="Trainingstage">
          <WorkoutCalendar />
        </Section>
        <Section title="Letzte Workouts">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              Noch keine abgeschlossenen Workouts.
              <div className="mt-3">
                <Link to="/training" className="text-brand-600 hover:underline">
                  Erstes Workout starten →
                </Link>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {entries.map(({ workout, setCount, volumeKg }) => (
                <li
                  key={workout.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">
                        {new Date(workout.startedAt).toLocaleDateString('de-DE', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                      {workout.routineName ? (
                        <div className="text-xs text-slate-500">{workout.routineName}</div>
                      ) : null}
                      {workout.notes ? (
                        <div className="mt-1 text-xs text-slate-500">„{workout.notes}"</div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-wide text-slate-500">Dauer</div>
                      <div className="text-sm font-medium tabular-nums">
                        {formatWorkoutLength(workout.startedAt, workout.finishedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Stat label="Sätze" value={String(setCount)} />
                    <Stat label="Volumen" value={`${Math.round(volumeKg)} kg`} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900/40">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  );
}
