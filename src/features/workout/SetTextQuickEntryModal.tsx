import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { Exercise, WeightUnit } from '../../db/schema';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { AiError } from '../../lib/anthropicClient';
import { kgToUnit, unitToKg } from '../../lib/units';
import { useRestTimer } from '../../store/restTimer';
import { estimateNlSetShorthand, type NlParsedSet } from './workoutAiLib';
import { commitNlSetShorthand } from './nlSetLogService';

interface Props {
  open: boolean;
  onClose: () => void;
  workoutId: string;
  exercise: Exercise;
  unit: WeightUnit;
  restSeconds: number;
}

const inputCls =
  'w-16 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800';

/** Exercise-scoped quick text entry — no exercise resolution needed, only weight/reps/rpe shorthand parsing. */
export function SetTextQuickEntryModal({ open, onClose, workoutId, exercise, unit, restSeconds }: Props) {
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const apiKey = settings?.anthropicApiKey ?? '';

  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sets, setSets] = useState<NlParsedSet[] | null>(null);
  const startRest = useRestTimer((s) => s.start);

  useEffect(() => {
    if (!open) {
      setText('');
      setBusy(false);
      setError(null);
      setSets(null);
    }
  }, [open]);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await estimateNlSetShorthand(apiKey, text, exercise.name);
      setSets(result);
    } catch (err) {
      setError(err instanceof AiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const updateSet = (index: number, patch: Partial<NlParsedSet>) => {
    setSets((prev) => (prev ? prev.map((s, i) => (i === index ? { ...s, ...patch } : s)) : prev));
  };

  const removeSet = (index: number) => {
    setSets((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  };

  const confirm = async () => {
    if (!sets || sets.length === 0) return;
    await commitNlSetShorthand(workoutId, exercise.id, sets);
    // Retrospective batch logging — one rest-timer start at the end, not per set (see ExerciseBlock.handleComplete for the per-set equivalent).
    if (sets.some((s) => !s.isWarmup)) startRest(restSeconds);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Per Text protokollieren" size="compact">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Per Text protokollieren</h2>
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
      ) : sets === null ? (
        <>
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Sätze für {exercise.name}
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="z. B. 100kg 5 Wdh, dann 5, dann 5"
              className="min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
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
          {sets.length === 0 ? (
            <p className="text-sm text-slate-500">Keine Sätze erkannt.</p>
          ) : (
            <ul className="space-y-2">
              {sets.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    value={Math.round(kgToUnit(s.weightKg, unit) * 10) / 10}
                    onChange={(e) => updateSet(i, { weightKg: unitToKg(Number(e.target.value) || 0, unit) })}
                    className={inputCls}
                    aria-label={`Gewicht Satz ${i + 1}`}
                  />
                  <span className="text-xs text-slate-500">{unit}</span>
                  <input
                    inputMode="numeric"
                    value={s.reps}
                    onChange={(e) => updateSet(i, { reps: Number(e.target.value) || 0 })}
                    className={inputCls}
                    aria-label={`Wiederholungen Satz ${i + 1}`}
                  />
                  <span className="text-xs text-slate-500">Wdh</span>
                  <button
                    type="button"
                    aria-label={`Satz ${i + 1} entfernen`}
                    onClick={() => removeSet(i)}
                    className="ml-auto rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSets(null)}>
              Neu erkennen
            </Button>
            <Button className="flex-1" onClick={() => void confirm()} disabled={sets.length === 0}>
              Sätze übernehmen ({sets.length})
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
