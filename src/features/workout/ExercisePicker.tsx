import { useMemo, useState } from 'react';
import { Search, Star, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import {
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_LABELS,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from '../../db/schema';
import { MuscleChip } from '../../components/MuscleChip';
import { Modal } from '../../components/Modal';
import { cardClassName } from '../../lib/cardStyles';
import { toggleFavorite } from '../exercises/exercisesLib';
import { recentExercisesForPicker } from './workoutLib';

const EMPTY_EXERCISES: Exercise[] = [];
const MUSCLE_OPTIONS: MuscleGroup[] = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS: Equipment[] = Object.keys(EQUIPMENT_LABELS) as Equipment[];

interface Props {
  open: boolean;
  excludeExerciseIds?: string[];
  onClose: () => void;
  onPick: (exerciseId: string) => void;
}

export function ExercisePicker({ open, excludeExerciseIds = [], onClose, onPick }: Props) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState<Equipment | ''>('');
  const exercisesQuery = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const exercises = exercisesQuery ?? EMPTY_EXERCISES;
  const recentsQuery = useLiveQuery(() => recentExercisesForPicker(8), []);
  const recents = recentsQuery ?? EMPTY_EXERCISES;

  const exclude = useMemo(() => new Set(excludeExerciseIds), [excludeExerciseIds]);
  const isSearching = search.trim() !== '';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((e) => {
      if (exclude.has(e.id)) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      if (muscleFilter && !e.primaryMuscles.includes(muscleFilter)) return false;
      if (equipmentFilter && e.equipment !== equipmentFilter) return false;
      return true;
    });
  }, [exercises, search, muscleFilter, equipmentFilter, exclude]);

  const favorites = useMemo(
    () => exercises.filter((e) => e.isFavorite && !exclude.has(e.id)),
    [exercises, exclude],
  );
  const visibleRecents = useMemo(
    () => recents.filter((e) => !exclude.has(e.id)),
    [recents, exclude],
  );

  return (
    <Modal open={open} onClose={onClose} title="Übung auswählen" size="fill">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Übung hinzufügen</h2>
        <button
          type="button"
          aria-label="Schließen"
          onClick={onClose}
          className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche…"
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        <FilterChip
          label="Alle Muskeln"
          active={muscleFilter === ''}
          onClick={() => setMuscleFilter('')}
        />
        {MUSCLE_OPTIONS.map((m) => (
          <FilterChip
            key={m}
            label={MUSCLE_GROUP_LABELS[m]}
            active={muscleFilter === m}
            onClick={() => setMuscleFilter(muscleFilter === m ? '' : m)}
          />
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <FilterChip
          label="Alle Geräte"
          active={equipmentFilter === ''}
          onClick={() => setEquipmentFilter('')}
        />
        {EQUIPMENT_OPTIONS.map((eq) => (
          <FilterChip
            key={eq}
            label={EQUIPMENT_LABELS[eq]}
            active={equipmentFilter === eq}
            onClick={() => setEquipmentFilter(equipmentFilter === eq ? '' : eq)}
          />
        ))}
      </div>

      {!isSearching && favorites.length > 0 ? (
        <section className="mb-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Favoriten
          </h3>
          <div className="flex flex-wrap gap-1">
            {favorites.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onPick(ex.id)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
              >
                {ex.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!isSearching && visibleRecents.length > 0 ? (
        <section className="mb-3">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Zuletzt verwendet
          </h3>
          <div className="flex flex-wrap gap-1">
            {visibleRecents.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onPick(ex.id)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
              >
                {ex.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <ul className="flex-1 space-y-2 overflow-y-auto">
        {filtered.map((ex) => (
          <li key={ex.id} className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => onPick(ex.id)}
              className={cardClassName({ interactive: true, className: 'flex-1 p-3 text-left' })}
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
              </div>
            </button>
            <button
              type="button"
              aria-label={ex.isFavorite ? `Favorit entfernen: ${ex.name}` : `Als Favorit markieren: ${ex.name}`}
              aria-pressed={Boolean(ex.isFavorite)}
              onClick={() => void toggleFavorite(ex.id, Boolean(ex.isFavorite))}
              className="flex shrink-0 items-center justify-center rounded-xl border border-slate-200 px-3 hover:border-brand-500 dark:border-slate-700"
            >
              <Star
                className={`h-4 w-4 ${ex.isFavorite ? 'fill-brand-500 text-brand-500' : 'text-slate-400'}`}
              />
            </button>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="py-8 text-center text-sm text-slate-500">Nichts gefunden.</li>
        ) : null}
      </ul>
    </Modal>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-2 py-0.5 text-xs ${
        active
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
