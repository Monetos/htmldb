import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Exercise, WeightUnit } from '../../db/schema';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { formatWeightInUnit, kgToUnit, parseWeightInput } from '../../lib/units';
import { calculateAllOneRm } from '../../lib/oneRepMax';
import { calculatePlates, PLATES_KG, PLATES_LB } from '../../lib/plateCalculator';
import { generateWarmupSteps, WARMUP_SET_COUNT_OPTIONS } from '../../lib/warmupGenerator';
import { bulkAddWarmupSets } from './workoutLib';
import { PlateDiagram } from './PlateDiagram';

type CalculatorTab = 'oneRm' | 'warmup' | 'plates';

interface Props {
  open: boolean;
  onClose: () => void;
  workoutId: string;
  exercise: Exercise;
  unit: WeightUnit;
  initialWeightKg?: number;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800';

export function CalculatorModal({ open, onClose, workoutId, exercise, unit, initialWeightKg }: Props) {
  const showPlates = exercise.equipment === 'barbell';
  const [tab, setTab] = useState<CalculatorTab>('oneRm');

  const initialInUnit = useMemo(() => {
    if (initialWeightKg === undefined) return '';
    const v = kgToUnit(initialWeightKg, unit);
    return String(unit === 'lbs' ? Math.round(v) : Math.round(v * 10) / 10);
  }, [initialWeightKg, unit]);

  const tabs: { id: CalculatorTab; label: string }[] = [
    { id: 'oneRm', label: '1RM' },
    { id: 'warmup', label: 'Warmup' },
    ...(showPlates ? [{ id: 'plates' as const, label: 'Platten' }] : []),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Rechner" size="compact">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Rechner</h2>
        <button
          type="button"
          aria-label="Schließen"
          onClick={onClose}
          className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              tab === t.id
                ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'oneRm' ? <OneRmPanel unit={unit} initialInUnit={initialInUnit} /> : null}
      {tab === 'warmup' ? (
        <WarmupPanel
          unit={unit}
          initialInUnit={initialInUnit}
          workoutId={workoutId}
          exerciseId={exercise.id}
          onGenerated={onClose}
        />
      ) : null}
      {tab === 'plates' && showPlates ? <PlatesPanel unit={unit} initialInUnit={initialInUnit} /> : null}
    </Modal>
  );
}

function OneRmPanel({ unit, initialInUnit }: { unit: WeightUnit; initialInUnit: string }) {
  const [weight, setWeight] = useState(initialInUnit);
  const [reps, setReps] = useState('5');

  const results = useMemo(() => {
    const weightKg = parseWeightInput(weight, unit);
    const repsNum = Number(reps);
    if (weightKg === undefined || !Number.isFinite(repsNum)) return [];
    return calculateAllOneRm(weightKg, repsNum);
  }, [weight, reps, unit]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Gewicht ({unit})
          </span>
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Wiederholungen
          </span>
          <input
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
      {results.length > 0 ? (
        <ul className="space-y-1">
          {results.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
            >
              <span className="text-slate-500">{r.label}</span>
              <span className="font-medium tabular-nums">
                {formatWeightInUnit(r.oneRmKg, unit)} {unit}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Gewicht und Wiederholungen eingeben.</p>
      )}
    </div>
  );
}

function WarmupPanel({
  unit,
  initialInUnit,
  workoutId,
  exerciseId,
  onGenerated,
}: {
  unit: WeightUnit;
  initialInUnit: string;
  workoutId: string;
  exerciseId: string;
  onGenerated: () => void;
}) {
  const [weight, setWeight] = useState(initialInUnit);
  const [count, setCount] = useState<(typeof WARMUP_SET_COUNT_OPTIONS)[number]>(3);
  const [generating, setGenerating] = useState(false);

  const targetKg = parseWeightInput(weight, unit);
  const steps = useMemo(
    () => (targetKg !== undefined ? generateWarmupSteps(targetKg, count) : []),
    [targetKg, count],
  );

  const onGenerate = async () => {
    if (steps.length === 0) return;
    setGenerating(true);
    try {
      await bulkAddWarmupSets(
        workoutId,
        exerciseId,
        steps.map((s) => ({ weightKg: s.weightKg })),
      );
      onGenerated();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Zielgewicht ({unit})
        </span>
        <input
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className={inputCls}
        />
      </label>
      <div>
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Anzahl Warmup-Sätze
        </span>
        <div className="flex flex-wrap gap-1.5">
          {WARMUP_SET_COUNT_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={count === n}
              onClick={() => setCount(n)}
              className={`rounded-full border px-3 py-1 text-sm ${
                count === n
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {steps.length > 0 ? (
        <ul className="space-y-1">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60"
            >
              <span className="text-slate-500">{s.percent}%</span>
              <span className="font-medium tabular-nums">
                {formatWeightInUnit(s.weightKg, unit)} {unit}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Zielgewicht eingeben, um Warmup-Sätze zu sehen.</p>
      )}
      <Button onClick={onGenerate} disabled={steps.length === 0 || generating} className="w-full">
        Sätze generieren
      </Button>
    </div>
  );
}

function PlatesPanel({ unit, initialInUnit }: { unit: WeightUnit; initialInUnit: string }) {
  const [weight, setWeight] = useState(initialInUnit);
  const plateSet = unit === 'lbs' ? PLATES_LB : PLATES_KG;

  const weightNum = Number(weight.replace(',', '.'));
  const breakdown =
    Number.isFinite(weightNum) && weightNum > 0
      ? calculatePlates(weightNum, plateSet.barWeight, plateSet.plateOptions)
      : null;

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Zielgewicht ({unit})
        </span>
        <input
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className={inputCls}
        />
      </label>
      <p className="text-xs text-slate-500">
        Standardstange: {plateSet.barWeight} {unit}
      </p>
      {breakdown ? (
        <>
          <PlateDiagram perSidePlates={breakdown.perSidePlates} unit={unit} />
          <p className="text-center text-sm">
            Pro Seite:{' '}
            {breakdown.perSidePlates.length > 0
              ? breakdown.perSidePlates.map((p) => `${p}`).join(' + ')
              : '– (nur Stange)'}{' '}
            {unit}
          </p>
          {breakdown.remainder > 0 ? (
            <p className="text-center text-xs text-amber-600 dark:text-amber-400">
              {breakdown.remainder.toFixed(2)} {unit} pro Seite nicht mit diesen Scheiben erreichbar.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-slate-500">Zielgewicht eingeben, um Platten zu berechnen.</p>
      )}
    </div>
  );
}
