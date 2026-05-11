import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { Exercise, SetEntry } from '../../db/schema';
import { useRestTimer } from '../../store/restTimer';
import { addSet, deleteSet, lastWorkoutSetsForExercise } from './workoutLib';
import { SetDraftRow, type DraftSet } from './SetRow';
import { Button } from '../../components/Button';
import { MuscleChip } from '../../components/MuscleChip';
import { formatWeight } from '../../lib/format';

interface Props {
  workoutId: string;
  exercise: Exercise;
}

export function ExerciseBlock({ workoutId, exercise }: Props) {
  const sets =
    useLiveQuery(
      () =>
        db.sets
          .where('workoutId')
          .equals(workoutId)
          .filter((s) => s.exerciseId === exercise.id)
          .sortBy('setNumber'),
      [workoutId, exercise.id],
    ) ?? [];

  const lastReference = useLiveQuery(
    () => lastWorkoutSetsForExercise(exercise.id, workoutId),
    [exercise.id, workoutId],
  );

  const [showDraft, setShowDraft] = useState(sets.length === 0);
  const startRest = useRestTimer((s) => s.start);

  // Pre-fill new set from the most recent set of this exercise in *any* workout
  const lastPrev = lastReference?.sets;
  const previousSet: SetEntry | undefined =
    sets[sets.length - 1] ?? (lastPrev && lastPrev.length > 0 ? lastPrev[lastPrev.length - 1] : undefined);
  const draftInitial: DraftSet | undefined = previousSet
    ? {
        weightKg: previousSet.weightKg,
        reps: previousSet.reps,
        rpe: '',
        isWarmup: false,
      }
    : undefined;

  const handleComplete = async (input: {
    weightKg: number;
    reps: number;
    rpe?: number;
    isWarmup: boolean;
  }) => {
    await addSet({ workoutId, exerciseId: exercise.id, ...input });
    if (!input.isWarmup) {
      startRest(exercise.defaultRestSeconds);
    }
    setShowDraft(false);
  };

  return (
    <section
      aria-label={`Übung ${exercise.name}`}
      className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40"
    >
      <header className="mb-2 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{exercise.name}</h3>
            <Link
              to={`/uebungen/${exercise.id}`}
              aria-label="Details"
              className="text-slate-400 hover:text-brand-500"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {exercise.primaryMuscles.map((m) => (
              <MuscleChip key={m} muscle={m} />
            ))}
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          Pause {exercise.defaultRestSeconds}s
        </div>
      </header>

      {lastReference ? (
        <details className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
          <summary className="cursor-pointer select-none">
            Letztes Mal: {new Date(lastReference.workout.startedAt).toLocaleDateString('de-DE')}
          </summary>
          <ul className="mt-1 list-inside list-decimal">
            {lastReference.sets.map((s) => (
              <li key={s.id}>
                {formatWeight(s.weightKg)} kg × {s.reps}
                {s.isWarmup ? ' (Warmup)' : ''}
                {s.rpe ? ` @ RPE ${s.rpe}` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-500">
            <th className="w-8 px-1 py-1 text-center">#</th>
            <th className="px-1 py-1 text-center">kg</th>
            <th className="px-1 py-1 text-center">Wdh</th>
            <th className="w-14 px-1 py-1 text-center">RPE</th>
            <th className="w-10 px-1 py-1 text-center">W</th>
            <th className="w-20 px-1 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {sets.map((s) => (
            <tr key={s.id} className="border-t border-slate-200 dark:border-slate-700">
              <td className="px-1 py-2 text-center text-xs font-medium text-slate-500">
                {s.setNumber}
              </td>
              <td className="px-1 py-2 text-center tabular-nums">{formatWeight(s.weightKg)}</td>
              <td className="px-1 py-2 text-center tabular-nums">{s.reps}</td>
              <td className="px-1 py-2 text-center tabular-nums text-slate-500">
                {s.rpe ?? '–'}
              </td>
              <td className="px-1 py-2 text-center">{s.isWarmup ? '✓' : ''}</td>
              <td className="px-1 py-2">
                <button
                  type="button"
                  aria-label={`Satz ${s.setNumber} löschen`}
                  onClick={() => deleteSet(s.id)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
          {showDraft ? (
            <SetDraftRow
              setNumber={sets.length + 1}
              initial={draftInitial}
              onComplete={handleComplete}
              onCancel={sets.length > 0 ? () => setShowDraft(false) : undefined}
            />
          ) : null}
        </tbody>
      </table>

      {!showDraft ? (
        <div className="mt-2">
          <Button size="sm" variant="secondary" onClick={() => setShowDraft(true)}>
            + Satz hinzufügen
          </Button>
        </div>
      ) : null}
    </section>
  );
}
