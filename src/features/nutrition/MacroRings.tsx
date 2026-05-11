import type { DailyTargets, Macros } from '../../db/schema';

interface RingDef {
  label: string;
  current: number;
  target: number;
  suffix: string;
  color: string;
}

interface Props {
  macros: Macros;
  targets: DailyTargets;
}

export function MacroRings({ macros, targets }: Props) {
  const rings: RingDef[] = [
    { label: 'kcal', current: macros.kcal, target: targets.kcal, suffix: '', color: '#6366f1' },
    {
      label: 'Protein',
      current: macros.protein,
      target: targets.proteinG,
      suffix: 'g',
      color: '#10b981',
    },
    { label: 'Carbs', current: macros.carbs, target: targets.carbsG, suffix: 'g', color: '#f59e0b' },
    { label: 'Fett', current: macros.fat, target: targets.fatG, suffix: 'g', color: '#f43f5e' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {rings.map((r) => (
        <Ring key={r.label} {...r} />
      ))}
    </div>
  );
}

function Ring({ label, current, target, suffix, color }: RingDef) {
  const size = 64;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? Math.min(1, current / target) : 0;
  const dashOffset = circumference * (1 - ratio);
  const overshoot = target > 0 && current > target;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label} ${Math.round(current)}${suffix} von ${target}${suffix}`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-slate-200 dark:text-slate-700"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xs font-semibold tabular-nums ${overshoot ? 'text-rose-600 dark:text-rose-400' : ''}`}>
            {Math.round(current)}
          </span>
          <span className="text-[10px] text-slate-500">/ {target}</span>
        </div>
      </div>
      <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}
