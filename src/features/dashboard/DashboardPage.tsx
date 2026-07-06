import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { db } from '../../db/database';
import { DEFAULT_DAILY_TARGETS, type DailyTargets, type Food } from '../../db/schema';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { StreakBanner } from '../progress/StreakBanner';
import { MacroRings } from '../nutrition/MacroRings';
import { dayAnchor, totalsFromEntries } from '../nutrition/nutritionLib';
import { latestWeightTrend } from '../body/bodyLib';
import { getActiveWorkout, lastWorkoutDate, startFreeWorkout, workoutsThisWeekCount } from '../workout/workoutLib';
import { useWeightUnit } from '../../hooks/useWeightUnit';
import { formatWeightInUnit, kgToUnit } from '../../lib/units';
import type { BodyMetric, FoodLogEntry, WaterLogEntry } from '../../db/schema';

const EMPTY_METRICS: BodyMetric[] = [];
const EMPTY_ENTRIES: FoodLogEntry[] = [];
const EMPTY_WATER: WaterLogEntry[] = [];

export function DashboardPage() {
  const navigate = useNavigate();
  const now = Date.now();
  const { unit } = useWeightUnit();

  const activeWorkout = useLiveQuery(() => getActiveWorkout(), []);
  const weekCount = useLiveQuery(() => workoutsThisWeekCount(now), []);
  const lastDate = useLiveQuery(() => lastWorkoutDate(), []);
  const weightTrend = useLiveQuery(() => latestWeightTrend(now), []);
  const recentMetricsQuery = useLiveQuery(() => db.bodyMetrics.orderBy('date').toArray(), []);
  const recentMetrics = recentMetricsQuery ?? EMPTY_METRICS;
  const sparklinePoints = useMemo(
    () =>
      recentMetrics
        .filter((m): m is typeof m & { weightKg: number } => typeof m.weightKg === 'number')
        .slice(-10),
    [recentMetrics],
  );

  const anchor = dayAnchor(now);
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const targets: DailyTargets = settings?.dailyTargets ?? DEFAULT_DAILY_TARGETS;
  const entriesQuery = useLiveQuery(() => db.foodLog.where('date').equals(anchor).toArray(), [anchor]);
  const entries = entriesQuery ?? EMPTY_ENTRIES;
  const waterQuery = useLiveQuery(() => db.waterLog.where('date').equals(anchor).toArray(), [anchor]);
  const water = waterQuery ?? EMPTY_WATER;
  const foodIds = useMemo(() => Array.from(new Set(entries.map((e) => e.foodId))), [entries]);
  const foodsById = useLiveQuery(
    async () => {
      const map = new Map<string, Food>();
      if (foodIds.length === 0) return map;
      const foods = await db.foods.bulkGet(foodIds);
      foods.forEach((f, i) => {
        if (f) map.set(foodIds[i], f);
      });
      return map;
    },
    [foodIds.join(',')],
  );
  const nutritionTotals = useMemo(
    () => totalsFromEntries(entries, foodsById ?? new Map(), water),
    [entries, foodsById, water],
  );

  const onQuickStart = async () => {
    if (!activeWorkout) await startFreeWorkout();
    navigate('/training');
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <AppHeader title="Home" />
      <div className="mt-4 space-y-4">
        <StreakBanner />

        <Card className="p-4">
          <p className="mb-3 text-sm text-slate-500">
            {activeWorkout ? 'Ein Workout läuft gerade.' : 'Bereit für dein nächstes Workout?'}
          </p>
          <Button className="w-full" onClick={() => void onQuickStart()}>
            {activeWorkout ? 'Fortsetzen' : 'Freies Workout starten'}
          </Button>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Diese Woche
          </h2>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div>
              <div className="text-2xl font-semibold tabular-nums">{weekCount ?? 0}</div>
              <div className="text-xs text-slate-500">Workouts</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular-nums">
                {lastDate ? new Date(lastDate).toLocaleDateString('de-DE') : '–'}
              </div>
              <div className="text-xs text-slate-500">Letztes Training</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Körpergewicht
          </h2>
          {weightTrend ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatWeightInUnit(weightTrend.latestKg, unit)} {unit}
                </div>
                <WeightDelta deltaKg={weightTrend.deltaKg} unit={unit} />
              </div>
              <WeightSparkline points={sparklinePoints.map((m) => kgToUnit(m.weightKg, unit))} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Noch keine Körperdaten erfasst.</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ernährung heute
            </h2>
            <Link to="/ernaehrung" className="text-xs text-brand-600 hover:underline dark:text-brand-400">
              Details
            </Link>
          </div>
          <MacroRings macros={nutritionTotals.macros} targets={targets} />
        </Card>

        <Card className="p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mehr entdecken
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <QuickLink to="/routinen" label="Routinen" />
            <QuickLink to="/uebungen" label="Übungen" />
            <QuickLink to="/koerper/fotos" label="Fotos" />
            <QuickLink to="/einstellungen" label="Einstellungen" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function WeightDelta({ deltaKg, unit }: { deltaKg: number | null; unit: 'kg' | 'lbs' }) {
  if (deltaKg === null) return <div className="text-xs text-slate-500">Kein Vergleichswert</div>;
  const deltaInUnit = kgToUnit(Math.abs(deltaKg), unit);
  const rounded = unit === 'lbs' ? Math.round(deltaInUnit) : Math.round(deltaInUnit * 10) / 10;
  if (Math.abs(deltaKg) < 0.05) {
    return (
      <div className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus className="h-3 w-3" /> Unverändert (30 Tage)
      </div>
    );
  }
  const isDown = deltaKg < 0;
  return (
    <div
      className={`inline-flex items-center gap-1 text-xs ${
        isDown ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
      }`}
    >
      {isDown ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
      {isDown ? '-' : '+'}
      {rounded} {unit} (30 Tage)
    </div>
  );
}

function WeightSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const width = 120;
  const height = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * height;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="text-brand-500">
      <polyline points={coords.join(' ')} fill="none" stroke="currentColor" strokeWidth={2} />
    </svg>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-xl border border-slate-200 px-3 py-2 text-center text-sm hover:border-brand-500 dark:border-slate-700"
    >
      {label}
    </Link>
  );
}
