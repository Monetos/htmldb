import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../../db/database';
import { filterByTimeRange, perWorkoutExerciseStats, type TimeRange } from '../../lib/progression';
import type { SetEntry, Workout } from '../../db/schema';

const EMPTY_SETS: SetEntry[] = [];

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1J' },
  { value: 'all', label: 'Alle' },
];

interface Props {
  exerciseId: string;
}

export function ExerciseTrendCharts({ exerciseId }: Props) {
  const [range, setRange] = useState<TimeRange>('3m');

  const setsQuery = useLiveQuery(
    () => db.sets.where('exerciseId').equals(exerciseId).toArray(),
    [exerciseId],
  );
  const sets = setsQuery ?? EMPTY_SETS;

  const workoutIds = useMemo(() => Array.from(new Set(sets.map((s) => s.workoutId))), [sets]);
  const workoutsMap = useLiveQuery(
    async () => {
      if (workoutIds.length === 0) return new Map<string, Workout>();
      const rows = await db.workouts.bulkGet(workoutIds);
      const map = new Map<string, Workout>();
      rows.forEach((w, i) => {
        if (w) map.set(workoutIds[i], w);
      });
      return map;
    },
    [workoutIds.join(',')],
  );

  const points = useMemo(() => {
    if (!workoutsMap) return [];
    const all = perWorkoutExerciseStats(sets, workoutsMap);
    return filterByTimeRange(all, range, Date.now()).map((p) => ({
      ...p,
      date: new Date(p.startedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
    }));
  }, [sets, workoutsMap, range]);

  if (points.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
        Noch keine Trainingsdaten für diese Übung im gewählten Zeitraum.
        <div className="mt-3">
          <RangeTabs range={range} onChange={setRange} />
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Verlauf
        </h2>
        <RangeTabs range={range} onChange={setRange} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40">
        <p className="mb-1 text-xs text-slate-500">Höchstes Gewicht pro Workout</p>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => [`${v} kg`, 'Top']}
              />
              <Line
                dataKey="topWeightKg"
                type="monotone"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40">
        <p className="mb-1 text-xs text-slate-500">Gesamtvolumen pro Workout</p>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} width={50} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(v: number) => [`${Math.round(v)} kg`, 'Volumen']}
              />
              <Line
                dataKey="volumeKg"
                type="monotone"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function RangeTabs({ range, onChange }: { range: TimeRange; onChange: (r: TimeRange) => void }) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
      {RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={`rounded-lg px-2 py-1 text-xs ${
            range === r.value
              ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
              : 'text-slate-500'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
