import { db } from '../../db/database';
import type { DailyTargets, Food, FoodLogEntry, Macros, MealType, WaterLogEntry } from '../../db/schema';
import { newId } from '../../lib/id';
import type { WeightTrend } from '../body/bodyLib';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Returns the local midnight (anchor) timestamp for the day containing `ts`. */
export function dayAnchor(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** End-exclusive next-day anchor. */
export function nextDayAnchor(ts: number): number {
  const d = new Date(dayAnchor(ts));
  d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function macrosForAmount(per100g: Macros, amountG: number): Macros {
  const factor = amountG / 100;
  return {
    kcal: per100g.kcal * factor,
    protein: per100g.protein * factor,
    carbs: per100g.carbs * factor,
    fat: per100g.fat * factor,
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export interface DailyTotals {
  macros: Macros;
  waterMl: number;
}

export function totalsFromEntries(
  entries: FoodLogEntry[],
  foodsById: Map<string, Food>,
  water: WaterLogEntry[],
): DailyTotals {
  let macros: Macros = { ...ZERO_MACROS };
  for (const e of entries) {
    const f = foodsById.get(e.foodId);
    if (!f) continue;
    macros = addMacros(macros, macrosForAmount(f.per100g, e.amountG));
  }
  const waterMl = water.reduce((acc, w) => acc + w.amountMl, 0);
  return { macros, waterMl };
}

/* ─────────────── CRUD ─────────────── */

export interface FoodInput {
  id?: string;
  name: string;
  brand?: string;
  per100g: Macros;
}

export async function saveFood(input: FoodInput): Promise<Food> {
  if (!input.name.trim()) throw new Error('Name darf nicht leer sein.');
  if (input.id) {
    await db.foods.update(input.id, {
      name: input.name.trim(),
      brand: input.brand?.trim() || undefined,
      per100g: input.per100g,
    });
    const row = await db.foods.get(input.id);
    if (!row) throw new Error('Lebensmittel nicht gefunden.');
    return row;
  }
  const row: Food = {
    id: newId(),
    name: input.name.trim(),
    brand: input.brand?.trim() || undefined,
    per100g: input.per100g,
    isCustom: true,
    createdAt: Date.now(),
  };
  await db.foods.add(row);
  return row;
}

export async function deleteFood(id: string): Promise<void> {
  await db.foods.delete(id);
}

export async function logFood(input: {
  foodId: string;
  amountG: number;
  mealType: MealType;
  date: number;
}): Promise<FoodLogEntry> {
  const entry: FoodLogEntry = {
    id: newId(),
    foodId: input.foodId,
    amountG: input.amountG,
    mealType: input.mealType,
    date: dayAnchor(input.date),
    loggedAt: Date.now(),
  };
  await db.foodLog.add(entry);
  return entry;
}

export async function deleteFoodLogEntry(id: string): Promise<void> {
  await db.foodLog.delete(id);
}

export async function logWater(amountMl: number, date: number): Promise<WaterLogEntry> {
  const entry: WaterLogEntry = {
    id: newId(),
    amountMl,
    date: dayAnchor(date),
    loggedAt: Date.now(),
  };
  await db.waterLog.add(entry);
  return entry;
}

export async function deleteWaterEntry(id: string): Promise<void> {
  await db.waterLog.delete(id);
}

/**
 * Returns the most recently logged foods (distinct by foodId) up to `limit`.
 * Used by the picker's "Letzte 10" quick-access section.
 */
export async function recentFoods(limit: number): Promise<Food[]> {
  const recentEntries = await db.foodLog.orderBy('date').reverse().limit(limit * 5).toArray();
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const e of recentEntries) {
    if (seen.has(e.foodId)) continue;
    seen.add(e.foodId);
    ids.push(e.foodId);
    if (ids.length >= limit) break;
  }
  if (ids.length === 0) return [];
  const rows = await db.foods.bulkGet(ids);
  return rows.filter((f): f is Food => Boolean(f));
}

/**
 * Amount (g) of the most recent log entry for this food, or null. Used to
 * prefill the picker with "what you usually eat" instead of a static 100 g.
 */
export async function lastAmountForFood(foodId: string): Promise<number | null> {
  const rows = await db.foodLog.orderBy('date').reverse().toArray();
  const match = rows
    .filter((e) => e.foodId === foodId)
    .sort((a, b) => b.loggedAt - a.loggedAt)[0];
  return match ? match.amountG : null;
}

/* ─────────────── Week aggregation ─────────────── */

export interface WeeklyDay {
  dayStart: number;
  totals: DailyTotals;
}

export async function weeklyTotals(now: number, days: number): Promise<WeeklyDay[]> {
  const foods = await db.foods.toArray();
  const foodsById = new Map<string, Food>(foods.map((f) => [f.id, f]));
  const out: WeeklyDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const anchor = dayAnchor(now - i * 24 * 60 * 60 * 1000);
    const next = anchor + 24 * 60 * 60 * 1000;
    const entries = await db.foodLog.where('date').between(anchor, next, true, false).toArray();
    const water = await db.waterLog.where('date').between(anchor, next, true, false).toArray();
    out.push({ dayStart: anchor, totals: totalsFromEntries(entries, foodsById, water) });
  }
  return out;
}

/* ─────────────── Adaptive TDEE + weekly digest support (Phase 17) ─────────────── */

export interface DailyKcal {
  date: number;
  kcal: number;
  /** True only if at least one real foodLog row exists for this day — a 0-kcal total is ambiguous otherwise. */
  hasLog: boolean;
}

/**
 * Per-day kcal totals plus an explicit "was anything logged" flag, oldest →
 * newest. weeklyTotals()'s zero-kcal days can't tell "nothing logged" apart
 * from "logged and ate zero" — this is the honest signal adaptiveTdee needs
 * to build its IntakeDay[] input (only days with hasLog:true count).
 */
export async function dailyKcalWithLogFlag(now: number, days: number): Promise<DailyKcal[]> {
  const foods = await db.foods.toArray();
  const foodsById = new Map<string, Food>(foods.map((f) => [f.id, f]));
  const out: DailyKcal[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const anchor = dayAnchor(now - i * DAY_MS);
    const next = anchor + DAY_MS;
    const entries = await db.foodLog.where('date').between(anchor, next, true, false).toArray();
    const kcal = entries.reduce((sum, e) => {
      const f = foodsById.get(e.foodId);
      return f ? sum + macrosForAmount(f.per100g, e.amountG).kcal : sum;
    }, 0);
    out.push({ date: anchor, kcal, hasLog: entries.length > 0 });
  }
  return out;
}

export interface WeeklyDigestStats {
  avgKcal: number;
  targetKcal: number;
  kcalAdherencePercent: number;
  avgProteinG: number;
  targetProteinG: number;
  proteinAdherencePercent: number;
  daysWithLog: number;
  totalDays: number;
  weightChangeKg: number | null;
  weightTrendDays: number | null;
  tdeeEstimateKcal: number | null;
}

/**
 * Pure aggregation over an already-fetched week + targets + weight trend —
 * no DB access, everything the AI digest prompt needs precomputed so the
 * model only writes prose about numbers it's given, never invents any.
 */
export function buildDigestStats(
  week: WeeklyDay[],
  targets: DailyTargets,
  weightTrend: WeightTrend | null,
  tdeeEstimateKcal: number | null,
): WeeklyDigestStats {
  const totalDays = week.length;
  const daysWithLog = week.filter((d) => d.totals.macros.kcal > 0).length;
  const sumKcal = week.reduce((sum, d) => sum + d.totals.macros.kcal, 0);
  const sumProtein = week.reduce((sum, d) => sum + d.totals.macros.protein, 0);
  const avgKcal = totalDays > 0 ? sumKcal / totalDays : 0;
  const avgProteinG = totalDays > 0 ? sumProtein / totalDays : 0;
  return {
    avgKcal,
    targetKcal: targets.kcal,
    kcalAdherencePercent: targets.kcal > 0 ? (avgKcal / targets.kcal) * 100 : 0,
    avgProteinG,
    targetProteinG: targets.proteinG,
    proteinAdherencePercent: targets.proteinG > 0 ? (avgProteinG / targets.proteinG) * 100 : 0,
    daysWithLog,
    totalDays,
    weightChangeKg: weightTrend?.deltaKg ?? null,
    weightTrendDays:
      weightTrend?.comparedToDate != null
        ? Math.round((weightTrend.latestDate - weightTrend.comparedToDate) / DAY_MS)
        : null,
    tdeeEstimateKcal,
  };
}
