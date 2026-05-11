import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { db } from '../../db/database';
import type { Exercise, RoutineExercise } from '../../db/schema';
import { Button } from '../../components/Button';
import { ExercisePicker } from '../workout/ExercisePicker';
import { saveRoutine } from './routinesLib';

export function RoutineFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [loaded, setLoaded] = useState(!editing);
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || !id) return;
    let cancelled = false;
    db.routines.get(id).then((r) => {
      if (cancelled) return;
      if (!r) {
        setError('Routine nicht gefunden.');
        setLoaded(true);
        return;
      }
      setName(r.name);
      setDescription(r.description ?? '');
      setExercises(r.exercises.slice().sort((a, b) => a.order - b.order));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  const exerciseIds = useMemo(() => exercises.map((e) => e.exerciseId), [exercises]);
  const exerciseMap = useLiveQuery(
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

  const move = (index: number, delta: -1 | 1) => {
    setExercises((list) => {
      const target = index + delta;
      if (target < 0 || target >= list.length) return list;
      const next = list.slice();
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((e, i) => ({ ...e, order: i }));
    });
  };

  const removeAt = (index: number) => {
    setExercises((list) => list.filter((_, i) => i !== index).map((e, i) => ({ ...e, order: i })));
  };

  const update = (index: number, patch: Partial<RoutineExercise>) => {
    setExercises((list) => list.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const onPick = async (exerciseId: string) => {
    setShowPicker(false);
    // Default targets — favour compound-friendly numbers, but pull rest from the exercise.
    const ex = await db.exercises.get(exerciseId);
    setExercises((list) => [
      ...list,
      {
        exerciseId,
        order: list.length,
        targetSets: 4,
        targetRepsMin: 6,
        targetRepsMax: 10,
        targetRestSeconds: ex?.defaultRestSeconds ?? 120,
      },
    ]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Bitte einen Namen vergeben.');
    if (exercises.length === 0) return setError('Mindestens eine Übung.');
    for (const re of exercises) {
      if (re.targetSets <= 0) return setError('Zielsätze müssen mindestens 1 sein.');
      if (re.targetRepsMin <= 0 || re.targetRepsMax < re.targetRepsMin)
        return setError('Wdh-Bereich ist ungültig.');
    }
    const saved = await saveRoutine({
      id: editing ? id : undefined,
      name,
      description,
      exercises,
    });
    navigate(`/routinen/${saved.id}`);
  };

  if (!loaded) {
    return <div className="p-6 text-sm text-slate-500">Lade…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <Link
        to="/routinen"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>
      <h1 className="mb-4 text-xl font-semibold">
        {editing ? 'Routine bearbeiten' : 'Neue Routine'}
      </h1>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            autoFocus={!editing}
          />
        </Field>
        <Field label="Beschreibung (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputCls} min-h-[60px]`}
          />
        </Field>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Übungen
            </h2>
            <Button
              size="sm"
              type="button"
              variant="secondary"
              onClick={() => setShowPicker(true)}
            >
              <Plus className="h-4 w-4" /> Übung
            </Button>
          </div>
          {exercises.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
              Noch keine Übungen.
            </p>
          ) : (
            <ol className="space-y-2">
              {exercises.map((re, i) => {
                const ex = exerciseMap?.get(re.exerciseId);
                return (
                  <li
                    key={`${re.exerciseId}-${i}`}
                    className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-500">#{i + 1}</div>
                        <div className="font-medium">{ex?.name ?? 'Übung gelöscht'}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Übung ${i + 1} hoch`}
                          onClick={() => move(i, -1)}
                          disabled={i === 0}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Übung ${i + 1} runter`}
                          onClick={() => move(i, 1)}
                          disabled={i === exercises.length - 1}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Übung ${i + 1} entfernen`}
                          onClick={() => removeAt(i)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <NumberField
                        label="Sätze"
                        value={re.targetSets}
                        min={1}
                        onChange={(v) => update(i, { targetSets: v })}
                      />
                      <NumberField
                        label="Wdh min"
                        value={re.targetRepsMin}
                        min={1}
                        onChange={(v) => update(i, { targetRepsMin: v })}
                      />
                      <NumberField
                        label="Wdh max"
                        value={re.targetRepsMax}
                        min={1}
                        onChange={(v) => update(i, { targetRepsMax: v })}
                      />
                      <NumberField
                        label="Pause s"
                        value={re.targetRestSeconds}
                        min={0}
                        step={5}
                        onChange={(v) => update(i, { targetRestSeconds: v })}
                      />
                      <label className="col-span-2 block">
                        <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">
                          Notiz
                        </span>
                        <input
                          value={re.note ?? ''}
                          onChange={(e) =>
                            update(i, { note: e.target.value || undefined })
                          }
                          className={inputCls}
                          placeholder="z. B. Pyramide"
                        />
                      </label>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {editing ? 'Speichern' : 'Anlegen'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Abbrechen
          </Button>
        </div>
      </form>

      <ExercisePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onPick={onPick}
        excludeExerciseIds={exercises.map((e) => e.exerciseId)}
      />
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={inputCls}
      />
    </label>
  );
}
