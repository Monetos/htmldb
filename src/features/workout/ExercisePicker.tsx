import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { EQUIPMENT_LABELS, type Exercise } from '../../db/schema';
import { MuscleChip } from '../../components/MuscleChip';
import { Modal } from '../../components/Modal';
import { cardClassName } from '../../lib/cardStyles';

const EMPTY_EXERCISES: Exercise[] = [];

interface Props {
  open: boolean;
  excludeExerciseIds?: string[];
  onClose: () => void;
  onPick: (exerciseId: string) => void;
}

export function ExercisePicker({ open, excludeExerciseIds = [], onClose, onPick }: Props) {
  const [search, setSearch] = useState('');
  const exercisesQuery = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []);
  const exercises = exercisesQuery ?? EMPTY_EXERCISES;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const exclude = new Set(excludeExerciseIds);
    return exercises.filter((e) => {
      if (exclude.has(e.id)) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [exercises, search, excludeExerciseIds]);

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
      <ul className="flex-1 space-y-2 overflow-y-auto">
        {filtered.map((ex) => (
          <li key={ex.id}>
            <button
              type="button"
              onClick={() => onPick(ex.id)}
              className={cardClassName({ interactive: true, className: 'w-full p-3 text-left' })}
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
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="py-8 text-center text-sm text-slate-500">Nichts gefunden.</li>
        ) : null}
      </ul>
    </Modal>
  );
}
