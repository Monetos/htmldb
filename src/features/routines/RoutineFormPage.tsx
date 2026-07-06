import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowDown, ArrowLeft, ArrowUp, Link2, Plus, Trash2 } from 'lucide-react';
import { db } from '../../db/database';
import type { Exercise, RoutineExercise } from '../../db/schema';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { SupersetGroup } from '../../components/SupersetGroup';
import { toContiguousBlocks } from '../../lib/exerciseGrouping';
import { newId } from '../../lib/id';
import { ExercisePicker } from '../workout/ExercisePicker';
import { ROUTINE_TEMPLATES } from '../../db/routineTemplates';
import { TemplatePickerModal } from './TemplatePickerModal';
import { applyRoutineTemplate, saveRoutine } from './routinesLib';

export function RoutineFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [loaded, setLoaded] = useState(!editing);
  const [showPicker, setShowPicker] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
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

  /** Superset/circuit groups must stay contiguous, so reordering/removing operates on whole blocks. */
  const indexBlocks = useMemo(() => {
    const withIdx = exercises.map((e, i) => ({ groupId: e.groupId, i }));
    return toContiguousBlocks(withIdx).map((block) => block.map((x) => x.i));
  }, [exercises]);

  const moveBlock = (blockIndex: number, delta: -1 | 1) => {
    setExercises((list) => {
      const withIdx = list.map((e, i) => ({ groupId: e.groupId, i }));
      const blocks = toContiguousBlocks(withIdx).map((block) => block.map((x) => x.i));
      const target = blockIndex + delta;
      if (target < 0 || target >= blocks.length) return list;
      const nextBlocks = blocks.slice();
      [nextBlocks[blockIndex], nextBlocks[target]] = [nextBlocks[target], nextBlocks[blockIndex]];
      return nextBlocks.flat().map((i, order) => ({ ...list[i], order }));
    });
  };

  const removeAt = (index: number) => {
    setExercises((list) => {
      const removedGroupId = list[index].groupId;
      const filtered = list.filter((_, i) => i !== index);
      // Auto-ungroup a lone leftover — a "group" of 1 isn't a superset anymore.
      const finalized = removedGroupId
        ? filtered.map((e) => {
            if (e.groupId !== removedGroupId) return e;
            const remaining = filtered.filter((x) => x.groupId === removedGroupId);
            return remaining.length <= 1 ? { ...e, groupId: undefined } : e;
          })
        : filtered;
      return finalized.map((e, i) => ({ ...e, order: i }));
    });
  };

  const update = (index: number, patch: Partial<RoutineExercise>) => {
    setExercises((list) => list.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  /** Merges two adjacent blocks into one superset group (extends an existing one if either side has one). */
  const linkBlocks = (leftIndices: number[], rightIndices: number[]) => {
    setExercises((list) => {
      const groupId = list[leftIndices[0]].groupId ?? list[rightIndices[0]].groupId ?? newId();
      const merged = new Set([...leftIndices, ...rightIndices]);
      return list.map((e, i) => (merged.has(i) ? { ...e, groupId } : e));
    });
  };

  /** Splits a group after `index`, leaving a plain single behind on either side if only 1 member remains. */
  const splitAfter = (index: number) => {
    setExercises((list) => {
      const groupId = list[index].groupId;
      if (!groupId) return list;
      let start = index;
      while (start > 0 && list[start - 1].groupId === groupId) start--;
      let end = index;
      while (end < list.length - 1 && list[end + 1].groupId === groupId) end++;
      const leftId = index - start + 1 > 1 ? groupId : undefined;
      const rightId = end - index > 1 ? newId() : undefined;
      return list.map((e, i) => {
        if (i >= start && i <= index) return { ...e, groupId: leftId };
        if (i > index && i <= end) return { ...e, groupId: rightId };
        return e;
      });
    });
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

  const onPickTemplate = async (templateId: string) => {
    setShowTemplatePicker(false);
    const template = ROUTINE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const created = await applyRoutineTemplate(template);
    if (created.length === 0) return;
    if (created.length === 1) {
      navigate(`/routinen/${created[0].id}`);
    } else {
      navigate('/routinen');
    }
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
            <Card as="div" className="border-dashed p-4 text-center text-sm text-slate-500">
              <p>Noch keine Übungen.</p>
              {!editing ? (
                <Button
                  size="sm"
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => setShowTemplatePicker(true)}
                >
                  Vorlage verwenden
                </Button>
              ) : null}
            </Card>
          ) : (
            <ol className="space-y-2">
              {indexBlocks.map((indices, blockIndex) => {
                const isGroup = indices.length > 1;
                const nextIndices = indexBlocks[blockIndex + 1];
                // Merging two already-multi-member groups in one step is out of scope —
                // the user must split one side first.
                const canLinkWithNext = nextIndices !== undefined && !(isGroup && nextIndices.length > 1);
                return (
                  <li key={indices.join('-')} className="space-y-2">
                    {isGroup ? (
                      <SupersetGroup
                        label={`Superset (${indices.length} Übungen)`}
                        headerAction={
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Superset ${blockIndex + 1} hoch`}
                              onClick={() => moveBlock(blockIndex, -1)}
                              disabled={blockIndex === 0}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Superset ${blockIndex + 1} runter`}
                              onClick={() => moveBlock(blockIndex, 1)}
                              disabled={blockIndex === indexBlocks.length - 1}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </div>
                        }
                      >
                        {indices.map((i, memberIndex) => (
                          <div key={`${exercises[i].exerciseId}-${i}`} className="p-3">
                            <ExerciseRowHeader
                              index={i}
                              name={exerciseMap?.get(exercises[i].exerciseId)?.name ?? 'Übung gelöscht'}
                              trailing={
                                <button
                                  type="button"
                                  aria-label={`Übung ${i + 1} entfernen`}
                                  onClick={() => removeAt(i)}
                                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              }
                            />
                            <ExerciseTargetFields
                              routineExercise={exercises[i]}
                              onUpdate={(patch) => update(i, patch)}
                            />
                            {memberIndex < indices.length - 1 ? (
                              <button
                                type="button"
                                onClick={() => splitAfter(i)}
                                className="mt-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                              >
                                Trennen
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </SupersetGroup>
                    ) : (
                      <Card as="div">
                        <ExerciseRowHeader
                          index={indices[0]}
                          name={exerciseMap?.get(exercises[indices[0]].exerciseId)?.name ?? 'Übung gelöscht'}
                          trailing={
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                aria-label={`Übung ${indices[0] + 1} hoch`}
                                onClick={() => moveBlock(blockIndex, -1)}
                                disabled={blockIndex === 0}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Übung ${indices[0] + 1} runter`}
                                onClick={() => moveBlock(blockIndex, 1)}
                                disabled={blockIndex === indexBlocks.length - 1}
                                className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={`Übung ${indices[0] + 1} entfernen`}
                                onClick={() => removeAt(indices[0])}
                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          }
                        />
                        <ExerciseTargetFields
                          routineExercise={exercises[indices[0]]}
                          onUpdate={(patch) => update(indices[0], patch)}
                        />
                      </Card>
                    )}
                    {canLinkWithNext ? (
                      <button
                        type="button"
                        onClick={() => linkBlocks(indices, nextIndices)}
                        className="mx-auto flex items-center gap-1 text-xs text-brand-600 hover:underline dark:text-brand-400"
                      >
                        <Link2 className="h-3 w-3" /> Mit nächster Übung gruppieren
                      </button>
                    ) : null}
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
      <TemplatePickerModal
        open={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onPick={onPickTemplate}
      />
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800';

function ExerciseRowHeader({
  index,
  name,
  trailing,
}: {
  index: number;
  name: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="text-xs text-slate-500">#{index + 1}</div>
        <div className="font-medium">{name}</div>
      </div>
      {trailing}
    </div>
  );
}

function ExerciseTargetFields({
  routineExercise,
  onUpdate,
}: {
  routineExercise: RoutineExercise;
  onUpdate: (patch: Partial<RoutineExercise>) => void;
}) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
      <NumberField
        label="Sätze"
        value={routineExercise.targetSets}
        min={1}
        onChange={(v) => onUpdate({ targetSets: v })}
      />
      <NumberField
        label="Wdh min"
        value={routineExercise.targetRepsMin}
        min={1}
        onChange={(v) => onUpdate({ targetRepsMin: v })}
      />
      <NumberField
        label="Wdh max"
        value={routineExercise.targetRepsMax}
        min={1}
        onChange={(v) => onUpdate({ targetRepsMax: v })}
      />
      <NumberField
        label="Pause s"
        value={routineExercise.targetRestSeconds}
        min={0}
        step={5}
        onChange={(v) => onUpdate({ targetRestSeconds: v })}
      />
      <label className="col-span-2 block">
        <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Notiz</span>
        <input
          value={routineExercise.note ?? ''}
          onChange={(e) => onUpdate({ note: e.target.value || undefined })}
          className={inputCls}
          placeholder="z. B. Pyramide"
        />
      </label>
    </div>
  );
}

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
