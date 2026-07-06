import { useState } from 'react';
import { Check, Flame, Trash2, TrendingDown } from 'lucide-react';
import { Button } from '../../components/Button';
import type { UnilateralSide } from '../../db/schema';

export interface DraftSet {
  weightKg: number | '';
  reps: number | '';
  rpe: number | '';
  isWarmup: boolean;
  isDropSet: boolean;
  toFailure: boolean;
  unilateralSide: '' | UnilateralSide;
}

/** Shared column layout so header, set rows, and the draft row stay aligned. */
export const SET_ROW_GRID_COLS = 'grid grid-cols-[2rem_1fr_1fr_3.5rem_2.5rem_5rem] items-center';

interface Props {
  setNumber: number;
  initial?: DraftSet;
  onComplete: (s: {
    weightKg: number;
    reps: number;
    rpe?: number;
    isWarmup: boolean;
    isDropSet: boolean;
    toFailure: boolean;
    unilateralSide?: UnilateralSide;
  }) => void;
  onCancel?: () => void;
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800';

const EMPTY_DRAFT: DraftSet = {
  weightKg: '',
  reps: '',
  rpe: '',
  isWarmup: false,
  isDropSet: false,
  toFailure: false,
  unilateralSide: '',
};

export function SetDraftRow({ setNumber, initial, onComplete, onCancel }: Props) {
  const [draft, setDraft] = useState<DraftSet>(initial ?? EMPTY_DRAFT);

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
    onComplete({
      weightKg: w,
      reps: r,
      rpe,
      isWarmup: draft.isWarmup,
      isDropSet: draft.isDropSet,
      toFailure: draft.toFailure,
      unilateralSide: draft.unilateralSide || undefined,
    });
  };

  return (
    <div className="border-t border-slate-200 py-1 dark:border-slate-700">
    <div role="row" className={SET_ROW_GRID_COLS}>
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
      <div className="flex flex-wrap items-center gap-1.5 px-1 pt-1">
        <TagToggle
          label="Drop-Satz"
          ariaLabel={`Drop-Satz für Satz ${setNumber}`}
          icon={TrendingDown}
          active={draft.isDropSet}
          onClick={() => setDraft((d) => ({ ...d, isDropSet: !d.isDropSet }))}
        />
        <TagToggle
          label="Bis Muskelversagen"
          ariaLabel={`Bis Muskelversagen für Satz ${setNumber}`}
          icon={Flame}
          active={draft.toFailure}
          onClick={() => setDraft((d) => ({ ...d, toFailure: !d.toFailure }))}
        />
        <div className="flex overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
          <SideButton
            side="left"
            setNumber={setNumber}
            active={draft.unilateralSide === 'left'}
            onClick={() =>
              setDraft((d) => ({ ...d, unilateralSide: d.unilateralSide === 'left' ? '' : 'left' }))
            }
          />
          <SideButton
            side="right"
            setNumber={setNumber}
            active={draft.unilateralSide === 'right'}
            onClick={() =>
              setDraft((d) => ({ ...d, unilateralSide: d.unilateralSide === 'right' ? '' : 'right' }))
            }
          />
        </div>
      </div>
    </div>
  );
}

function TagToggle({
  label,
  ariaLabel,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  icon: typeof TrendingDown;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
        active
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function SideButton({
  side,
  setNumber,
  active,
  onClick,
}: {
  side: UnilateralSide;
  setNumber: number;
  active: boolean;
  onClick: () => void;
}) {
  const label = side === 'left' ? 'L' : 'R';
  return (
    <button
      type="button"
      aria-label={`${side === 'left' ? 'Linke' : 'Rechte'} Seite für Satz ${setNumber}`}
      aria-pressed={active}
      onClick={onClick}
      className={`px-2.5 py-0.5 text-xs font-semibold ${
        active
          ? 'bg-brand-500 text-white'
          : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
