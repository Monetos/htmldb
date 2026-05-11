import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Square } from 'lucide-react';
import { db } from '../../db/database';
import type { Routine, RoutineExercise, SetEntry } from '../../db/schema';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { lastPerformedMap } from '../routines/routinesLib';

const EMPTY_SETS: SetEntry[] = [];
const EMPTY_ROUTINES: Routine[] = [];

function RoutinesEmptyStateSection() {
  const routinesQuery = useLiveQuery(() => db.routines.orderBy('name').toArray(), []);
  const routines = routinesQuery ?? EMPTY_ROUTINES;
  const ids = useMemo(() => routines.map((r) => r.id), [routines]);
  const lastMap = useLiveQuery(() => lastPerformedMap(ids), [ids.join(',')]);

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Meine Routinen
        </h2>
        <Link
          to="/routinen/neu"
          className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
        >
          + Neue Routine
        </Link>
      </div>
      {routines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Noch keine Routinen.{' '}
          <Link to="/routinen/neu" className="text-brand-600 hover:underline">
            Erste anlegen →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {routines.map((r) => {
            const lastTs = lastMap?.get(r.id);
            return (
              <li key={r.id}>
                <Link
                  to={`/routinen/${r.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-500"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{r.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {r.exercises.length}{' '}
                        {r.exercises.length === 1 ? 'Übung' : 'Übungen'}
                        {' · '}
                        Zuletzt:{' '}
                        {lastTs ? new Date(lastTs).toLocaleDateString('de-DE') : '–'}
                      </div>
                    </div>
                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-700/30 dark:text-brand-300">
                      Tap zum Starten
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
import {
  exerciseOrderFromSets,
  finishWorkout,
  getActiveWorkout,
  getExerciseMap,
  startFreeWorkout,
  totalVolumeKg,
} from './workoutLib';
import { RestTimerBar } from './RestTimerBar';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseBlock } from './ExerciseBlock';
import { formatWorkoutLength } from '../../lib/format';
import { useRestTimer } from '../../store/restTimer';

export function ActiveWorkoutPage() {
  const navigate = useNavigate();
  const workout = useLiveQuery(() => getActiveWorkout(), []);

  // Track exercise order locally (allows adding exercises before any sets exist).
  const [extraExerciseIds, setExtraExerciseIds] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [bodyweight, setBodyweight] = useState('');
  const [notes, setNotes] = useState('');

  const setsQuery = useLiveQuery(
    () => (workout ? db.sets.where('workoutId').equals(workout.id).toArray() : []),
    [workout?.id],
  );
  const sets = setsQuery ?? EMPTY_SETS;

  const routine = useLiveQuery(
    async () => (workout?.routineId ? await db.routines.get(workout.routineId) : undefined),
    [workout?.routineId],
  );

  const orderedFromSets = useMemo(() => exerciseOrderFromSets(sets), [sets]);
  const exerciseIds = useMemo(() => {
    const all: string[] = [];
    // 1. Start with the routine's exercises in their saved order.
    if (routine) {
      const ordered = routine.exercises.slice().sort((a, b) => a.order - b.order);
      for (const re of ordered) if (!all.includes(re.exerciseId)) all.push(re.exerciseId);
    }
    // 2. Append anything that already has sets but isn't in the routine.
    for (const id of orderedFromSets) if (!all.includes(id)) all.push(id);
    // 3. Append manually-added extras last.
    for (const id of extraExerciseIds) if (!all.includes(id)) all.push(id);
    return all;
  }, [routine, orderedFromSets, extraExerciseIds]);

  const routineTargetByExerciseId = useMemo(() => {
    const map = new Map<string, RoutineExercise>();
    if (!routine) return map;
    for (const re of routine.exercises) map.set(re.exerciseId, re);
    return map;
  }, [routine]);

  const exerciseMap = useLiveQuery(() => getExerciseMap(exerciseIds), [exerciseIds.join(',')]);

  const skipTimer = useRestTimer((s) => s.skip);

  const onStart = async () => {
    await startFreeWorkout();
  };

  const onFinish = async () => {
    if (!workout) return;
    const bw = bodyweight ? Number(bodyweight) : undefined;
    await finishWorkout(workout.id, {
      bodyweightKg: Number.isFinite(bw) && bw && bw > 0 ? bw : undefined,
      notes: notes.trim() || undefined,
    });
    skipTimer();
    setShowFinish(false);
    setExtraExerciseIds([]);
    setBodyweight('');
    setNotes('');
    navigate('/statistik');
  };

  if (workout === undefined) {
    // Initial load — Dexie hook is still resolving.
    return (
      <div className="flex min-h-full flex-col">
        <AppHeader title="Training" />
      </div>
    );
  }

  if (workout === null) {
    return (
      <div className="flex min-h-full flex-col">
        <AppHeader title="Training" />
        <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-6">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-800/40">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kein Workout aktiv. Leg los, wenn du im Studio bist.
            </p>
            <Button onClick={onStart} className="mt-4">
              <Plus className="h-4 w-4" /> Freies Workout starten
            </Button>
          </div>
          <RoutinesEmptyStateSection />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Training" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-28 pt-2">
        <RestTimerBar />

        <div className="my-3">
          {workout.routineName ? (
            <div className="mb-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
              {workout.routineName}
            </div>
          ) : null}
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Läuft seit {new Date(workout.startedAt).toLocaleTimeString('de-DE', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            {' · '}
            {sets.length} Sätze · {Math.round(totalVolumeKg(sets))} kg Volumen
          </div>
        </div>

        <div className="space-y-3">
          {exerciseIds.map((id) => {
            const ex = exerciseMap?.get(id);
            if (!ex) return null;
            return (
              <ExerciseBlock
                key={id}
                workoutId={workout.id}
                exercise={ex}
                routineTarget={routineTargetByExerciseId.get(id)}
              />
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setShowPicker(true)}>
            <Plus className="h-4 w-4" /> Übung hinzufügen
          </Button>
          <Button variant="danger" onClick={() => setShowFinish(true)}>
            <Square className="h-4 w-4" /> Beenden
          </Button>
        </div>

        <ExercisePicker
          open={showPicker}
          excludeExerciseIds={exerciseIds}
          onClose={() => setShowPicker(false)}
          onPick={(id) => {
            setExtraExerciseIds((prev) => [...prev, id]);
            setShowPicker(false);
          }}
        />

        {showFinish ? (
          <div
            role="dialog"
            aria-label="Workout beenden"
            aria-modal="true"
            className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
            onClick={() => setShowFinish(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-t-2xl bg-white p-4 dark:bg-slate-900 sm:rounded-2xl"
            >
              <h2 className="mb-1 text-lg font-semibold">Workout beenden</h2>
              <p className="mb-3 text-sm text-slate-500">
                {sets.length} Sätze · {Math.round(totalVolumeKg(sets))} kg Volumen ·{' '}
                {formatWorkoutLength(workout.startedAt, Date.now())}
              </p>
              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Körpergewicht (kg, optional)
                </span>
                <input
                  inputMode="decimal"
                  value={bodyweight}
                  onChange={(e) => setBodyweight(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label className="mb-4 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Notizen
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowFinish(false)}>
                  Abbrechen
                </Button>
                <Button variant="primary" className="flex-1" onClick={onFinish}>
                  Beenden & speichern
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
