import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { WeightUnit } from '../../db/schema';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { AiError } from '../../lib/anthropicClient';
import { kgToUnit, unitToKg } from '../../lib/units';
import { useRestTimer } from '../../store/restTimer';
import { estimateNlSetLog, type NlSetLogGroup } from './workoutAiLib';
import { commitNlSetLogGroups, fetchExerciseCandidates, type ExerciseCandidate } from './nlSetLogService';

interface Props {
  open: boolean;
  onClose: () => void;
  workoutId: string;
  unit: WeightUnit;
  /** Called with the exerciseIds of every group that was actually committed, so the caller can surface them in the exercise list. */
  onCommitted: (exerciseIds: string[]) => void;
}

const inputCls =
  'w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800';

/** Page-level, multi-exercise text entry — resolves exercise names against the full library via workoutAiLib's schema-enum, review-before-write. */
export function NlSetLogModal({ open, onClose, workoutId, unit, onCommitted }: Props) {
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const apiKey = settings?.anthropicApiKey ?? '';

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<NlSetLogGroup[] | null>(null);
  const [candidates, setCandidates] = useState<ExerciseCandidate[]>([]);
  const [searchByIndex, setSearchByIndex] = useState<Record<number, string>>({});
  const startRest = useRestTimer((s) => s.start);

  useEffect(() => {
    if (!open) {
      setText('');
      setBusy(false);
      setError(null);
      setGroups(null);
      setSearchByIndex({});
      return;
    }
    fetchExerciseCandidates().then(setCandidates);
  }, [open]);

  const candidatesById = useMemo(() => new Map(candidates.map((c) => [c.id, c.name])), [candidates]);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await estimateNlSetLog(apiKey, text, candidates);
      setGroups(result);
    } catch (err) {
      setError(err instanceof AiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const updateGroup = (index: number, patch: Partial<NlSetLogGroup>) => {
    setGroups((prev) => (prev ? prev.map((g, i) => (i === index ? { ...g, ...patch } : g)) : prev));
  };

  const removeGroup = (index: number) => {
    setGroups((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateSet = (groupIndex: number, setIndex: number, patch: Partial<NlSetLogGroup['sets'][number]>) => {
    setGroups((prev) =>
      prev
        ? prev.map((g, i) =>
            i === groupIndex ? { ...g, sets: g.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) } : g,
          )
        : prev,
    );
  };

  const removeSet = (groupIndex: number, setIndex: number) => {
    setGroups((prev) =>
      prev
        ? prev.map((g, i) => (i === groupIndex ? { ...g, sets: g.sets.filter((_, j) => j !== setIndex) } : g))
        : prev,
    );
  };

  const allResolved = groups !== null && groups.length > 0 && groups.every((g) => g.exerciseId !== null);

  const confirm = async () => {
    if (!groups || !allResolved) return;
    const created = await commitNlSetLogGroups(workoutId, groups);
    const resolvedIds = Array.from(new Set(groups.map((g) => g.exerciseId).filter((id): id is string => id !== null)));

    const lastExerciseId = groups[groups.length - 1]?.exerciseId;
    const lastNonWarmup = groups[groups.length - 1]?.sets.some((s) => !s.isWarmup);
    if (lastExerciseId && lastNonWarmup) {
      const exercise = await db.exercises.get(lastExerciseId);
      if (exercise) startRest(exercise.defaultRestSeconds);
    }

    if (created.length > 0) onCommitted(resolvedIds);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Per Text protokollieren" size="auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-brand-500" /> Per Text protokollieren
        </h2>
        <button
          type="button"
          aria-label="Schließen"
          onClick={onClose}
          className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!apiKey ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          Für die Text-Protokollierung brauchst du einen Anthropic-API-Key.{' '}
          <Link to="/einstellungen" onClick={onClose} className="font-medium underline">
            In den Einstellungen hinterlegen →
          </Link>
        </div>
      ) : groups === null ? (
        <>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Was hast du trainiert?
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="z. B. Bankdrücken 100kg 5 Wdh, dann 5, dann 5. Kniebeuge 80kg 5, 85kg 5, 90kg 3."
              className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              autoFocus
            />
          </label>
          {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
          <Button onClick={() => void run()} disabled={busy || text.trim().length < 3}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Claude erkennt Sätze…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Sätze erkennen
              </>
            )}
          </Button>
        </>
      ) : (
        <div className="space-y-3">
          {groups.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Sätze erkannt.</p>
          ) : (
            groups.map((group, gi) => {
              const resolvedName = group.exerciseId ? candidatesById.get(group.exerciseId) : undefined;
              const query = searchByIndex[gi] ?? '';
              const matches =
                query.trim().length > 0
                  ? candidates.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
                  : [];
              return (
                <div
                  key={gi}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    {resolvedName ? (
                      <div className="font-medium">{resolvedName}</div>
                    ) : (
                      <div className="text-sm text-amber-700 dark:text-amber-300">
                        „{group.rawExerciseText}" nicht erkannt
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label="Gruppe verwerfen"
                      onClick={() => removeGroup(gi)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {!group.exerciseId ? (
                    <div className="mb-2">
                      <input
                        value={query}
                        onChange={(e) => setSearchByIndex((prev) => ({ ...prev, [gi]: e.target.value }))}
                        placeholder="Übung suchen…"
                        aria-label="Übung suchen"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                      />
                      {matches.length > 0 ? (
                        <ul className="mt-1 space-y-1">
                          {matches.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => updateGroup(gi, { exerciseId: c.id })}
                                className="w-full rounded-lg px-2 py-1 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                              >
                                {c.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}

                  <ul className="space-y-1">
                    {group.sets.map((s, si) => (
                      <li key={si} className="flex items-center gap-2">
                        <input
                          inputMode="decimal"
                          value={Math.round(kgToUnit(s.weightKg, unit) * 10) / 10}
                          onChange={(e) =>
                            updateSet(gi, si, { weightKg: unitToKg(Number(e.target.value) || 0, unit) })
                          }
                          className={inputCls}
                          aria-label={`Gewicht Satz ${si + 1}`}
                        />
                        <span className="text-xs text-slate-500">{unit}</span>
                        <input
                          inputMode="numeric"
                          value={s.reps}
                          onChange={(e) => updateSet(gi, si, { reps: Number(e.target.value) || 0 })}
                          className={inputCls}
                          aria-label={`Wiederholungen Satz ${si + 1}`}
                        />
                        <span className="text-xs text-slate-500">Wdh</span>
                        <button
                          type="button"
                          aria-label={`Satz ${si + 1} entfernen`}
                          onClick={() => removeSet(gi, si)}
                          className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setGroups(null)}>
              Neu erkennen
            </Button>
            <Button className="flex-1" onClick={() => void confirm()} disabled={!allResolved}>
              Sätze übernehmen ({groups.reduce((n, g) => n + g.sets.length, 0)})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
