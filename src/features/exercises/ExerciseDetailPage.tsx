import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { db } from '../../db/database';
import { EQUIPMENT_LABELS } from '../../db/schema';
import { Button } from '../../components/Button';
import { MuscleChip } from '../../components/MuscleChip';
import { ExerciseTrendCharts } from '../progress/ExerciseTrendCharts';

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const exercise = useLiveQuery(() => (id ? db.exercises.get(id) : undefined), [id]);

  if (!exercise) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8 text-center text-sm text-slate-500">
        Übung nicht gefunden.{' '}
        <Link to="/uebungen" className="text-brand-600">
          Zurück
        </Link>
      </div>
    );
  }

  const onDelete = async () => {
    if (!confirm(`„${exercise.name}" wirklich löschen?`)) return;
    await db.exercises.delete(exercise.id);
    navigate('/uebungen', { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <Link
        to="/uebungen"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>

      <header className="mb-4">
        <h1 className="text-2xl font-semibold">{exercise.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {EQUIPMENT_LABELS[exercise.equipment]}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {exercise.category === 'compound' ? 'Grundübung' : 'Isolation'}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            Pause: {exercise.defaultRestSeconds}s
          </span>
          {exercise.isCustom ? (
            <span className="rounded-full border border-brand-500 px-2 py-0.5 text-xs text-brand-600 dark:text-brand-400">
              Eigene
            </span>
          ) : null}
        </div>
      </header>

      <section className="mb-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Muskeln
        </h2>
        <div>
          <div className="text-xs text-slate-500">Primär</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {exercise.primaryMuscles.map((m) => (
              <MuscleChip key={m} muscle={m} />
            ))}
          </div>
        </div>
        {exercise.secondaryMuscles.length > 0 ? (
          <div>
            <div className="text-xs text-slate-500">Sekundär</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {exercise.secondaryMuscles.map((m) => (
                <MuscleChip key={m} muscle={m} variant="secondary" />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Setup
        </h2>
        <p className="text-sm">{exercise.execution.setup}</p>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bewegung
        </h2>
        <p className="text-sm">{exercise.execution.movement}</p>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Cues
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {exercise.execution.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/60">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Häufige Fehler
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {exercise.execution.commonMistakes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <div className="mb-4">
        <ExerciseTrendCharts exerciseId={exercise.id} />
      </div>

      {exercise.isCustom ? (
        <div className="flex gap-2">
          <Link to={`/uebungen/${exercise.id}/bearbeiten`} className="flex-1">
            <Button variant="secondary" className="w-full">
              <Pencil className="h-4 w-4" /> Bearbeiten
            </Button>
          </Link>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Löschen
          </Button>
        </div>
      ) : null}
    </div>
  );
}
