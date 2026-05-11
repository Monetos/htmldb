import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { filterByTimeRange, type TimeRange } from '../../lib/progression';
import type { BodyMetric } from '../../db/schema';

const RANGES: { value: TimeRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1J' },
  { value: 'all', label: 'Alle' },
];

interface Props {
  metrics: BodyMetric[];
}

interface Point {
  startedAt: number;
  date: string;
  weightKg?: number;
  bodyFatPercent?: number;
  waistCm?: number;
}

export function BodyTrendCharts({ metrics }: Props) {
  const [range, setRange] = useState<TimeRange>('3m');

  const points = useMemo<Point[]>(() => {
    const sorted = metrics.slice().sort((a, b) => a.date - b.date);
    return sorted.map((m) => ({
      startedAt: m.date,
      date: new Date(m.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      weightKg: m.weightKg,
      bodyFatPercent: m.bodyFatPercent,
      waistCm: m.measurements?.waistCm,
    }));
  }, [metrics]);

  const filtered = useMemo(
    () => filterByTimeRange(points, range, Date.now()),
    [points, range],
  );

  const hasWeight = filtered.some((p) => p.weightKg !== undefined);
  const hasBodyFat = filtered.some((p) => p.bodyFatPercent !== undefined);
  const hasWaist = filtered.some((p) => p.waistCm !== undefined);

  if (!hasWeight && !hasBodyFat && !hasWaist) {
    return null;
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Verlauf</h2>
        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              className={`rounded-lg px-2 py-1 text-xs ${
                range === r.value
                  ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-500'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {hasWeight ? (
          <Chart label="Gewicht (kg)" stroke="#4f46e5" data={filtered} dataKey="weightKg" suffix="kg" />
        ) : null}
        {hasBodyFat ? (
          <Chart label="Körperfett (%)" stroke="#f59e0b" data={filtered} dataKey="bodyFatPercent" suffix="%" />
        ) : null}
        {hasWaist ? (
          <Chart label="Taille (cm)" stroke="#10b981" data={filtered} dataKey="waistCm" suffix="cm" />
        ) : null}
      </div>
    </section>
  );
}

function Chart({
  label,
  stroke,
  data,
  dataKey,
  suffix,
}: {
  label: string;
  stroke: string;
  data: Point[];
  dataKey: 'weightKg' | 'bodyFatPercent' | 'waistCm';
  suffix: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40">
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} width={42} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(v: number) => [`${v} ${suffix}`, label]}
            />
            <Line
              dataKey={dataKey}
              type="monotone"
              stroke={stroke}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
