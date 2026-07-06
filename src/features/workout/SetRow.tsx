import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';

export interface DraftSet {
  weightKg: number | '';
  reps: number | '';
  rpe: number | '';
  isWarmup: boolean;
}

/** Shared column layout so header, set rows, and the draft row stay aligned. */
export const SET_ROW_GRID_COLS = 'grid grid-cols-[2rem_1fr_1fr_3.5rem_2.5rem_5rem] items-center';

interface Props {
  setNumber: number;
  initial?: DraftSet;
  onComplete: (s: { weightKg: number; reps: number; rpe?: number; isWarmup: boolean }) => void;
  onCancel?: () => void;
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800';

export function SetDraftRow({ setNumber, initial, onComplete, onCancel }: Props) {
  const [draft, setDraft] = useState<DraftSet>(
    initial ?? { weightKg: '', reps: '', rpe: '', isWarmup: false },
  );

  const submit = () => {
    const w = typeof draft.weightKg === 'number' ? draft.weightKg : Number(draft.weightKg);
    const r = typeof draft.reps === 'number' ? draft.reps : Number(draft.reps);
    if (!Number.isFinite(w) || w < 0) return;
    if (!Number.isFinite(r) || r <= 0) return;
    const rpe =
      draft.rpe === '' || draft.rpe === null
        ? undefined
        : typeof draft.rpe === 'number'
          ? draft.rpe
          : Number(draft.rpe);
    onComplete({ weightKg: w, reps: r, rpe, isWarmup: draft.isWarmup });
  };

  return (
    <div role="row" className={`${SET_ROW_GRID_COLS} border-t border-slate-200 py-1 dark:border-slate-700`}>
      <div role="cell" className="px-1 py-1 text-center text-xs font-medium text-slate-500">
        {setNumber}
      </div>
      <div role="cell" className="px-1 py-1">
        <input
          inputMode="decimal"
          aria-label={`Gewicht für Satz ${setNumber}`}
          value={draft.weightKg}
          onChange={(e) =>
            setDraft((d) => ({
              ...d,
              weightKg: e.target.value === '' ? '' : Number(e.target.value),
            }))
          }
          className={inputCls}
        />
      </div>
      <div role="cell" className="px-1 py-1">
        <input
          inputMode="numeric"
          aria-label={`Wiederholungen für Satz ${setNumber}`}
          value={draft.reps}
          onChange={(e) =>
            setDraft((d) => ({ ...d, reps: e.target.value === '' ? '' : Number(e.target.value) }))
          }
          className={inputCls}
        />
      </div>
      <div role="cell" className="px-1 py-1">
        <input
          inputMode="numeric"
          aria-label={`RPE für Satz ${setNumber}`}
          placeholder="–"
          value={draft.rpe}
          onChange={(e) =>
            setDraft((d) => ({ ...d, rpe: e.target.value === '' ? '' : Number(e.target.value) }))
          }
          className={inputCls}
        />
      </div>
      <div role="cell" className="px-1 py-1 text-center">
        <input
          type="checkbox"
          aria-label={`Warmup-Satz ${setNumber}`}
          checked={draft.isWarmup}
          onChange={(e) => setDraft((d) => ({ ...d, isWarmup: e.target.checked }))}
          className="h-4 w-4"
        />
      </div>
      <div role="cell" className="flex items-center gap-1 px-1 py-1">
        <Button size="sm" onClick={submit} aria-label="Satz abschließen">
          <Check className="h-4 w-4" />
        </Button>
        {onCancel ? (
          <button
            type="button"
            aria-label="Satz verwerfen"
            onClick={onCancel}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
