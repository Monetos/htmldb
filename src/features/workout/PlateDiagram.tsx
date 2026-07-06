import type { WeightUnit } from '../../db/schema';

interface Props {
  perSidePlates: number[];
  unit: WeightUnit;
}

/** Taller/wider bars for bigger plates — plain flexbox, no new dependency. */
function plateSizeClass(plate: number, unit: WeightUnit): string {
  const big = unit === 'lbs' ? 45 : 25;
  const mid = unit === 'lbs' ? 25 : 15;
  if (plate >= big) return 'h-16 w-3';
  if (plate >= mid) return 'h-12 w-2.5';
  return 'h-8 w-2';
}

function PlateStack({ plates, unit, reversed }: { plates: number[]; unit: WeightUnit; reversed?: boolean }) {
  const ordered = reversed ? plates.slice().reverse() : plates;
  return (
    <div className={`flex items-center gap-0.5 ${reversed ? 'flex-row-reverse' : ''}`}>
      {ordered.map((p, i) => (
        <div
          key={`${p}-${i}`}
          className={`rounded-sm bg-brand-500 dark:bg-brand-400 ${plateSizeClass(p, unit)}`}
          title={`${p} ${unit}`}
        />
      ))}
    </div>
  );
}

export function PlateDiagram({ perSidePlates, unit }: Props) {
  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <PlateStack plates={perSidePlates} unit={unit} reversed />
      <div className="h-2 w-16 rounded-full bg-slate-300 dark:bg-slate-600" aria-hidden />
      <PlateStack plates={perSidePlates} unit={unit} />
    </div>
  );
}
