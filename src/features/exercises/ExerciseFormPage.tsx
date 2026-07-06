import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { db } from '../../db/database';
import {
  EQUIPMENT_LABELS,
  MOVEMENT_PATTERN_LABELS,
  MUSCLE_GROUP_LABELS,
  type Equipment,
  type Exercise,
  type ExerciseCategory,
  type MovementPattern,
  type MuscleGroup,
} from '../../db/schema';
import { newId } from '../../lib/id';
import { Button } from '../../components/Button';

const MUSCLES: MuscleGroup[] = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];
const EQUIPMENT: Equipment[] = Object.keys(EQUIPMENT_LABELS) as Equipment[];
const MOVEMENT_PATTERNS: MovementPattern[] = Object.keys(MOVEMENT_PATTERN_LABELS) as MovementPattern[];

interface FormState {
  name: string;
  category: ExerciseCategory;
  equipment: Equipment;
  movementPattern: MovementPattern | '';
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  defaultRestSeconds: number;
  setup: string;
  movement: string;
  cues: string; // newline-separated
  commonMistakes: string; // newline-separated
}

function emptyForm(): FormState {
  return {
    name: '',
    category: 'compound',
    equipment: 'barbell',
    movementPattern: '',
    primaryMuscles: [],
    secondaryMuscles: [],
    defaultRestSeconds: 120,
    setup: '',
    movement: '',
    cues: '',
    commonMistakes: '',
  };
}

function fromExercise(e: Exercise): FormState {
  return {
    name: e.name,
    category: e.category,
    equipment: e.equipment,
    movementPattern: e.movementPattern ?? '',
    primaryMuscles: [...e.primaryMuscles],
    secondaryMuscles: [...e.secondaryMuscles],
    defaultRestSeconds: e.defaultRestSeconds,
    setup: e.execution.setup,
    movement: e.execution.movement,
    cues: e.execution.cues.join('\n'),
    commonMistakes: e.execution.commonMistakes.join('\n'),
  };
}

function splitLines(s: string): string[] {
  return s
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
}

export function ExerciseFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loaded, setLoaded] = useState(!editing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || !id) return;
    let cancelled = false;
    db.exercises.get(id).then((e) => {
      if (cancelled) return;
      if (!e) {
        setError('Übung nicht gefunden.');
        setLoaded(true);
        return;
      }
      if (!e.isCustom) {
        setError('Nur eigene Übungen können bearbeitet werden.');
        setLoaded(true);
        return;
      }
      setForm(fromExercise(e));
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  const toggleMuscle = (which: 'primaryMuscles' | 'secondaryMuscles', m: MuscleGroup) => {
    setForm((f) => {
      const has = f[which].includes(m);
      return { ...f, [which]: has ? f[which].filter((x) => x !== m) : [...f[which], m] };
    });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Bitte einen Namen vergeben.');
    if (form.primaryMuscles.length === 0) return setError('Mindestens eine primäre Muskelgruppe.');
    const now = Date.now();
    const cues = splitLines(form.cues);
    const mistakes = splitLines(form.commonMistakes);
    if (editing && id) {
      await db.exercises.update(id, {
        name: form.name.trim(),
        category: form.category,
        equipment: form.equipment,
        movementPattern: form.movementPattern || undefined,
        primaryMuscles: form.primaryMuscles,
        secondaryMuscles: form.secondaryMuscles,
        defaultRestSeconds: form.defaultRestSeconds,
        execution: {
          setup: form.setup.trim(),
          movement: form.movement.trim(),
          cues,
          commonMistakes: mistakes,
        },
      });
      navigate(`/uebungen/${id}`);
    } else {
      const exercise: Exercise = {
        id: newId(),
        name: form.name.trim(),
        category: form.category,
        equipment: form.equipment,
        movementPattern: form.movementPattern || undefined,
        primaryMuscles: form.primaryMuscles,
        secondaryMuscles: form.secondaryMuscles,
        defaultRestSeconds: form.defaultRestSeconds,
        execution: {
          setup: form.setup.trim(),
          movement: form.movement.trim(),
          cues,
          commonMistakes: mistakes,
        },
        isCustom: true,
        createdAt: now,
      };
      await db.exercises.add(exercise);
      navigate(`/uebungen/${exercise.id}`);
    }
  };

  if (!loaded) {
    return <div className="p-6 text-sm text-slate-500">Lade…</div>;
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <Link
        to="/uebungen"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>
      <h1 className="mb-4 text-xl font-semibold">
        {editing ? 'Übung bearbeiten' : 'Neue Übung'}
      </h1>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputCls}
            autoFocus={!editing}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Kategorie">
            <select
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value as ExerciseCategory }))
              }
              className={inputCls}
            >
              <option value="compound">Grundübung</option>
              <option value="isolation">Isolation</option>
            </select>
          </Field>
          <Field label="Equipment">
            <select
              value={form.equipment}
              onChange={(e) =>
                setForm((f) => ({ ...f, equipment: e.target.value as Equipment }))
              }
              className={inputCls}
            >
              {EQUIPMENT.map((eq) => (
                <option key={eq} value={eq}>
                  {EQUIPMENT_LABELS[eq]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Bewegungsmuster (optional)">
          <select
            value={form.movementPattern}
            onChange={(e) =>
              setForm((f) => ({ ...f, movementPattern: e.target.value as MovementPattern | '' }))
            }
            className={inputCls}
          >
            <option value="">Kein Muster</option>
            {MOVEMENT_PATTERNS.map((p) => (
              <option key={p} value={p}>
                {MOVEMENT_PATTERN_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Standard-Pause (Sekunden)">
          <input
            type="number"
            min={0}
            step={5}
            value={form.defaultRestSeconds}
            onChange={(e) =>
              setForm((f) => ({ ...f, defaultRestSeconds: Number(e.target.value) || 0 }))
            }
            className={inputCls}
          />
        </Field>

        <Field label="Primäre Muskeln">
          <MuscleToggle
            value={form.primaryMuscles}
            onToggle={(m) => toggleMuscle('primaryMuscles', m)}
          />
        </Field>
        <Field label="Sekundäre Muskeln (optional)">
          <MuscleToggle
            value={form.secondaryMuscles}
            onToggle={(m) => toggleMuscle('secondaryMuscles', m)}
          />
        </Field>

        <Field label="Setup">
          <textarea
            value={form.setup}
            onChange={(e) => setForm((f) => ({ ...f, setup: e.target.value }))}
            className={`${inputCls} min-h-[80px]`}
          />
        </Field>
        <Field label="Bewegungsablauf">
          <textarea
            value={form.movement}
            onChange={(e) => setForm((f) => ({ ...f, movement: e.target.value }))}
            className={`${inputCls} min-h-[80px]`}
          />
        </Field>
        <Field label="Cues (eine pro Zeile)">
          <textarea
            value={form.cues}
            onChange={(e) => setForm((f) => ({ ...f, cues: e.target.value }))}
            className={`${inputCls} min-h-[100px]`}
          />
        </Field>
        <Field label="Häufige Fehler (eine pro Zeile)">
          <textarea
            value={form.commonMistakes}
            onChange={(e) => setForm((f) => ({ ...f, commonMistakes: e.target.value }))}
            className={`${inputCls} min-h-[80px]`}
          />
        </Field>

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

function MuscleToggle({
  value,
  onToggle,
}: {
  value: MuscleGroup[];
  onToggle: (m: MuscleGroup) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {MUSCLES.map((m) => {
        const active = value.includes(m);
        return (
          <button
            key={m}
            type="button"
            onClick={() => onToggle(m)}
            className={`rounded-full border px-2 py-0.5 text-xs ${
              active
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {MUSCLE_GROUP_LABELS[m]}
          </button>
        );
      })}
    </div>
  );
}
