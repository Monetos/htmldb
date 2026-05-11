import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import {
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from '../../db/schema';

const EMPTY_EXERCISES: Exercise[] = [];
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { MuscleChip } from '../../components/MuscleChip';

const MUSCLE_OPTIONS: MuscleGroup[] = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS: Equipment[] = Object.keys(EQUIPMENT_LABELS) as Equipment[];

export function ExercisesPage() {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | ''>('');
  const [onlyCustom, setOnlyCustom] = useState(false);

  const exercisesQuery = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const exercises = exercisesQuery ?? EMPTY_EXERCISES;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q)) return false;
      if (muscleFilter && !e.primaryMuscles.includes(muscleFilter)) return false;
      if (equipmentFilter && e.equipment !== equipmentFilter) return false;
      if (onlyCustom && !e.isCustom) return false;
      return true;
    });
  }, [exercises, search, muscleFilter, equipmentFilter, onlyCustom]);

  const hasActiveFilter = muscleFilter || equipmentFilter || search || onlyCustom;

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Übungen" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} von {exercises.length} Übungen
          </p>
          <Link to="/uebungen/neu">
            <Button size="sm" variant="primary">
              <Plus className="h-4 w-4" />
              Neue Übung
            </Button>
          </Link>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche…"
            aria-label="Übung suchen"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <select
            value={muscleFilter}
            onChange={(e) => setMuscleFilter(e.target.value as MuscleGroup | '')}
            aria-label="Nach Muskelgruppe filtern"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Alle Muskelgruppen</option>
            {MUSCLE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_GROUP_LABELS[m]}
              </option>
            ))}
          </select>
          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value as Equipment | '')}
            aria-label="Nach Equipment filtern"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="">Alle Geräte</option>
            {EQUIPMENT_OPTIONS.map((e) => (
              <option key={e} value={e}>
                {EQUIPMENT_LABELS[e]}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={onlyCustom}
              onChange={(e) => setOnlyCustom(e.target.checked)}
              className="h-4 w-4"
            />
            Nur eigene
          </label>
          {hasActiveFilter ? (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setMuscleFilter('');
                setEquipmentFilter('');
                setOnlyCustom(false);
              }}
              className="ml-auto inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X className="h-3 w-3" /> Filter zurücksetzen
            </button>
          ) : null}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Keine Übungen mit diesen Filtern.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((ex) => (
              <li key={ex.id}>
                <Link
                  to={`/uebungen/${ex.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium">{ex.name}</div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {EQUIPMENT_LABELS[ex.equipment]}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ex.primaryMuscles.map((m) => (
                      <MuscleChip key={m} muscle={m} />
                    ))}
                    {ex.isCustom ? (
                      <span className="rounded-full border border-brand-500 px-2 py-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                        Eigene
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
