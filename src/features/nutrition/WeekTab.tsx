import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { db } from '../../db/database';
import type { DailyTargets } from '../../db/schema';
import { DEFAULT_DAILY_TARGETS } from '../../db/schema';
import { weeklyTotals, type WeeklyDay } from './nutritionLib';

const EMPTY_BUCKETS: WeeklyDay[] = [];

export function WeekTab() {
  const [buckets, setBuckets] = useState<WeeklyDay[]>(EMPTY_BUCKETS);
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const targets: DailyTargets = settings?.dailyTargets ?? DEFAULT_DAILY_TARGETS;

  useEffect(() => {
    let cancelled = false;
    weeklyTotals(Date.now(), 7).then((b) => {
      if (!cancelled) setBuckets(b);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-fetch on any nutrition-log change.
  const foodLogVersion = useLiveQuery(() => db.foodLog.count(), []);
  const waterLogVersion = useLiveQuery(() => db.waterLog.count(), []);
  useEffect(() => {
    let cancelled = false;
    weeklyTotals(Date.now(), 7).then((b) => {
      if (!cancelled) setBuckets(b);
    });
    return () => {
      cancelled = true;
    };
  }, [foodLogVersion, waterLogVersion]);

  const data = useMemo(
    () =>
      buckets.map((b) => ({
        day: new Date(b.dayStart).toLocaleDateString('de-DE', { weekday: 'short' }),
        kcal: Math.round(b.totals.macros.kcal),
        protein: Math.round(b.totals.macros.protein),
        carbs: Math.round(b.totals.macros.carbs),
        fat: Math.round(b.totals.macros.fat),
        waterMl: b.totals.waterMl,
      })),
    [buckets],
  );

  const avgMacros = useMemo(() => {
    if (data.length === 0) return { protein: 0, carbs: 0, fat: 0 };
    const sum = data.reduce(
      (acc, d) => ({
        protein: acc.protein + d.protein,
        carbs: acc.carbs + d.carbs,
        fat: acc.fat + d.fat,
      }),
      { protein: 0, carbs: 0, fat: 0 },
    );
    return {
      protein: sum.protein / data.length,
      carbs: sum.carbs / data.length,
      fat: sum.fat / data.length,
    };
  }, [data]);

  const macroPieData = [
    { name: 'Protein', value: avgMacros.protein * 4, color: '#10b981' },
    { name: 'Carbs', value: avgMacros.carbs * 4, color: '#f59e0b' },
    { name: 'Fett', value: avgMacros.fat * 9, color: '#f43f5e' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-3">
      <ChartCard title="Kalorien pro Tag">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} width={40} />
            <Tooltip formatter={(v: number) => [`${v} kcal`, 'Kalorien']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <ReferenceLine y={targets.kcal} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="kcal" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Protein pro Tag">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} width={40} />
            <Tooltip formatter={(v: number) => [`${v} g`, 'Protein']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <ReferenceLine y={targets.proteinG} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="protein" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Wasser pro Tag">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <XAxis dataKey="day" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} width={50} />
            <Tooltip formatter={(v: number) => [`${v} ml`, 'Wasser']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <ReferenceLine y={targets.waterMl} stroke="#94a3b8" strokeDasharray="4 4" />
            <Bar dataKey="waterMl" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {macroPieData.length > 0 ? (
        <ChartCard title="Ø Makro-Verteilung (kcal-Anteil)" height={180}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                formatter={(v: number, name: string) => [`${Math.round(v)} kcal`, name]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Pie data={macroPieData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                {macroPieData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      ) : null}
    </div>
  );
}

function ChartCard({ title, children, height = 160 }: { title: string; children: ReactNode; height?: number }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40">
      <p className="mb-1 text-xs text-slate-500">{title}</p>
      <div style={{ height }}>{children}</div>
    </section>
  );
}
