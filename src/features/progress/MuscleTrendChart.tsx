import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Bar, BarChart, Tooltip, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { db } from '../../db/database';
import { weeklyMuscleVolume } from '../../lib/progression';
import { MUSCLE_GROUP_LABELS, type Exercise, type MuscleGroup, type SetEntry } from '../../db/schema';

const EMPTY_SETS: SetEntry[] = [];
const EMPTY_EXERCISES: Exercise[] = [];

const DEFAULT_MUSCLE: MuscleGroup = 'chest';
const WEEKS = 12;
const MUSCLE_OPTIONS: MuscleGroup[] = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];

export function MuscleTrendChart() {
  const [muscle, setMuscle] = useState<MuscleGroup>(DEFAULT_MUSCLE);
  const setsQuery = useLiveQuery(() => db.sets.toArray(), []);
  const exercisesQuery = useLiveQuery(() => db.exercises.toArray(), []);
  const sets = setsQuery ?? EMPTY_SETS;
  const exercises = exercisesQuery ?? EMPTY_EXERCISES;

  const exMap = useMemo(() => {
    const m = new Map<string, Exercise>();
    for (const ex of exercises) m.set(ex.id, ex);
    return m;
  }, [exercises]);

  const data = useMemo(() => {
    const buckets = weeklyMuscleVolume(sets, exMap, Date.now(), WEEKS);
    return buckets.map((b) => ({
      week: new Date(b.weekStart).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      volume: Math.round(b.volume[muscle] ?? 0),
      sets: b.setCount[muscle] ?? 0,
    }));
  }, [sets, exMap, muscle]);

  const totalVolume = data.reduce((acc, d) => acc + d.volume, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">12-Wochen-Trend</h3>
          <p className="text-xs text-slate-500">Volumen pro Woche · {totalVolume} kg gesamt</p>
        </div>
        <select
          value={muscle}
          onChange={(e) => setMuscle(e.target.value as MuscleGroup)}
          aria-label="Muskelgruppe für Trend"
          className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          {MUSCLE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {MUSCLE_GROUP_LABELS[m]}
            </option>
          ))}
        </select>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <XAxis dataKey="week" fontSize={10} interval={1} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value: number) => [`${value} kg`, 'Volumen']}
              labelFormatter={(label: string) => `KW ${label}`}
            />
            <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
