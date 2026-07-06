import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Play, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { Exercise } from '../../db/schema';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MuscleChip } from '../../components/MuscleChip';
import { deleteRoutine, lastPerformedAt, startRoutineWorkout } from './routinesLib';
import { getActiveWorkout } from '../workout/workoutLib';

export function RoutineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const routine = useLiveQuery(() => (id ? db.routines.get(id) : undefined), [id]);
  const lastTs = useLiveQuery(() => (id ? lastPerformedAt(id) : Promise.resolve(null)), [id]);
  const exerciseIds = useMemo(
    () => (routine ? routine.exercises.map((e) => e.exerciseId) : []),
    [routine],
  );
  const exercises = useLiveQuery(
    async () => {
      if (exerciseIds.length === 0) return new Map<string, Exercise>();
      const rows = await db.exercises.bulkGet(exerciseIds);
      const map = new Map<string, Exercise>();
      rows.forEach((e, i) => {
        if (e) map.set(exerciseIds[i], e);
      });
      return map;
    },
    [exerciseIds.join(',')],
  );

  if (!routine) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8 text-center text-sm text-slate-500">
        Routine nicht gefunden.{' '}
        <Link to="/routinen" className="text-brand-600">
          Zurück
        </Link>
      </div>
    );
  }

  const onStart = async () => {
    setError(null);
    const active = await getActiveWorkout();
    if (active) {
      setError(
        'Ein anderes Workout läuft noch. Beende es zuerst, bevor du eine Routine startest.',
      );
      return;
    }
    await startRoutineWorkout(routine);
    navigate('/training');
  };

  const onDelete = async () => {
    if (!confirm(`„${routine.name}" wirklich löschen?`)) return;
    await deleteRoutine(routine.id);
    navigate('/routinen', { replace: true });
  };

  const orderedExercises = routine.exercises
    .slice()
    .sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <Link
        to="/routinen"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>

      <header className="mb-4">
        <h1 className="text-2xl font-semibold">{routine.name}</h1>
        {routine.description ? (
          <p className="mt-1 text-sm text-slate-500">{routine.description}</p>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          Zuletzt absolviert: {lastTs ? new Date(lastTs).toLocaleDateString('de-DE') : 'noch nie'}
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        <Button onClick={onStart} className="flex-1">
          <Play className="h-4 w-4" /> Starten
        </Button>
        <Link to={`/routinen/${routine.id}/bearbeiten`}>
          <Button variant="secondary">
            <Pencil className="h-4 w-4" /> Bearbeiten
          </Button>
        </Link>
        <Button variant="danger" onClick={onDelete} aria-label="Routine löschen">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {error ? <p className="mb-3 text-sm text-rose-600">{error}</p> : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Übungen
        </h2>
        {orderedExercises.length === 0 ? (
          <Card className="border-dashed p-4 text-center text-sm text-slate-500">
            Keine Übungen in dieser Routine.
          </Card>
        ) : (
          <ol className="space-y-2">
            {orderedExercises.map((re, i) => {
              const ex = exercises?.get(re.exerciseId);
              return (
                <Card as="li" key={`${re.exerciseId}-${i}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs text-slate-500">#{i + 1}</div>
                      <div className="font-medium">{ex?.name ?? 'Übung gelöscht'}</div>
                      {ex ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {ex.primaryMuscles.map((m) => (
                            <MuscleChip key={m} muscle={m} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <div>
                        {re.targetSets} × {re.targetRepsMin}–{re.targetRepsMax}
                      </div>
                      <div>Pause {re.targetRestSeconds}s</div>
                    </div>
                  </div>
                  {re.note ? (
                    <p className="mt-2 text-xs text-slate-500">„{re.note}"</p>
                  ) : null}
                </Card>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
