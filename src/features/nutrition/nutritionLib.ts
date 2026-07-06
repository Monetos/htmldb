import { db } from '../../db/database';
import type { Food, FoodLogEntry, Macros, MealType, WaterLogEntry } from '../../db/schema';
import { newId } from '../../lib/id';

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
