import { describe, expect, it } from 'vitest';
import {
  addMacros,
  buildDigestStats,
  dailyKcalWithLogFlag,
  dayAnchor,
  deleteFood,
  deleteFoodLogEntry,
  logFood,
  logWater,
  macrosForAmount,
  recentFoods,
  saveFood,
  totalsFromEntries,
  weeklyTotals,
  type WeeklyDay,
  ZERO_MACROS,
} from '../nutritionLib';
import { db, seedFoodsIfEmpty } from '../../../db/database';
import { SEED_FOOD_COUNT } from '../../../db/seedFoods';
import type { DailyTargets, Food } from '../../../db/schema';
import type { WeightTrend } from '../../body/bodyLib';

describe('macrosForAmount', () => {
  it('scales linearly from per-100g values', () => {
    const result = macrosForAmount({ kcal: 100, protein: 10, carbs: 20, fat: 5 }, 250);
    expect(result.kcal).toBeCloseTo(250, 5);
    expect(result.protein).toBeCloseTo(25, 5);
    expect(result.carbs).toBeCloseTo(50, 5);
    expect(result.fat).toBeCloseTo(12.5, 5);
  });

  it('returns zero for an amount of 0g', () => {
    const result = macrosForAmount({ kcal: 200, protein: 20, carbs: 30, fat: 5 }, 0);
    expect(result).toEqual(ZERO_MACROS);
  });
});

describe('addMacros', () => {
  it('sums each macro independently', () => {
    expect(
      addMacros({ kcal: 1, protein: 2, carbs: 3, fat: 4 }, { kcal: 10, protein: 20, carbs: 30, fat: 40 }),
    ).toEqual({ kcal: 11, protein: 22, carbs: 33, fat: 44 });
  });
});

describe('dayAnchor', () => {
  it('snaps to 00:00 local time', () => {
    const ts = new Date(2026, 4, 11, 14, 30, 12).getTime();
    expect(dayAnchor(ts)).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).getTime());
  });
});

describe('seedFoodsIfEmpty', () => {
  it('inserts the seed library and is idempotent', async () => {
    expect(await db.foods.count()).toBe(0);
    expect(await seedFoodsIfEmpty()).toBe(SEED_FOOD_COUNT);
    expect(await db.foods.count()).toBe(SEED_FOOD_COUNT);
    expect(await seedFoodsIfEmpty()).toBe(0);
    expect(await db.foods.count()).toBe(SEED_FOOD_COUNT);
  });
});

describe('saveFood / deleteFood', () => {
  it('creates a custom food with trimmed name + brand', async () => {
    const row = await saveFood({
      name: '  Skyr  ',
      brand: '  Lidl  ',
      per100g: { kcal: 65, protein: 11, carbs: 4, fat: 0.2 },
    });
    expect(row.name).toBe('Skyr');
    expect(row.brand).toBe('Lidl');
    expect(row.isCustom).toBe(true);
  });

  it('rejects empty names', async () => {
    await expect(
      saveFood({ name: '   ', per100g: { kcal: 0, protein: 0, carbs: 0, fat: 0 } }),
    ).rejects.toThrow();
  });

  it('updates in place', async () => {
    const row = await saveFood({
      name: 'A',
      per100g: { kcal: 100, protein: 10, carbs: 10, fat: 5 },
    });
    const updated = await saveFood({
      id: row.id,
      name: 'A v2',
      per100g: { kcal: 110, protein: 12, carbs: 10, fat: 5 },
    });
    expect(updated.id).toBe(row.id);
    expect(updated.name).toBe('A v2');
    expect(await db.foods.count()).toBe(1);
  });

  it('deletes', async () => {
    const row = await saveFood({ name: 'A', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } });
    await deleteFood(row.id);
    expect(await db.foods.get(row.id)).toBeUndefined();
  });
});

describe('logFood / logWater + totalsFromEntries', () => {
  it('logs entries against the local day anchor and totals them', async () => {
    const food = await saveFood({
      name: 'Quark',
      per100g: { kcal: 67, protein: 12, carbs: 4, fat: 0.3 },
    });
    const date = new Date(2026, 4, 11, 14).getTime();
    await logFood({ foodId: food.id, amountG: 250, mealType: 'breakfast', date });
    await logFood({ foodId: food.id, amountG: 150, mealType: 'snack', date });
    await logWater(500, date);
    await logWater(250, date);

    const anchor = dayAnchor(date);
    const entries = await db.foodLog.where('date').equals(anchor).toArray();
    const water = await db.waterLog.where('date').equals(anchor).toArray();
    const foodsById = new Map<string, Food>([[food.id, food]]);
    const totals = totalsFromEntries(entries, foodsById, water);
    expect(totals.macros.kcal).toBeCloseTo(67 * 4, 5); // 400g total
    expect(totals.macros.protein).toBeCloseTo(12 * 4, 5);
    expect(totals.waterMl).toBe(750);
  });

  it('ignores entries whose food row was deleted', async () => {
    const food = await saveFood({
      name: 'X',
      per100g: { kcal: 100, protein: 10, carbs: 10, fat: 5 },
    });
    await logFood({ foodId: food.id, amountG: 100, mealType: 'lunch', date: Date.now() });
    await deleteFood(food.id);
    const totals = totalsFromEntries(
      await db.foodLog.toArray(),
      new Map(),
      [],
    );
    expect(totals.macros.kcal).toBe(0);
  });

  it('deletes a single food log entry', async () => {
    const food = await saveFood({
      name: 'A',
      per100g: { kcal: 1, protein: 1, carbs: 1, fat: 1 },
    });
    const entry = await logFood({
      foodId: food.id,
      amountG: 100,
      mealType: 'snack',
      date: Date.now(),
    });
    await deleteFoodLogEntry(entry.id);
    expect(await db.foodLog.count()).toBe(0);
  });
});

describe('recentFoods', () => {
  it('returns the most recently logged foods, distinct by foodId, limited', async () => {
    const a = await saveFood({ name: 'A', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } });
    const b = await saveFood({ name: 'B', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } });
    const c = await saveFood({ name: 'C', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } });
    const day = 86_400_000;
    await logFood({ foodId: a.id, amountG: 100, mealType: 'lunch', date: Date.now() - 3 * day });
    await logFood({ foodId: b.id, amountG: 100, mealType: 'lunch', date: Date.now() - 2 * day });
    await logFood({ foodId: a.id, amountG: 100, mealType: 'lunch', date: Date.now() - 1 * day });
    await logFood({ foodId: c.id, amountG: 100, mealType: 'lunch', date: Date.now() });

    const recents = await recentFoods(2);
    expect(recents.map((f) => f.id)).toEqual([c.id, a.id]);
  });
});

describe('weeklyTotals', () => {
  it('returns one bucket per day in oldest → newest order', async () => {
    const food = await saveFood({
      name: 'Q',
      per100g: { kcal: 67, protein: 12, carbs: 4, fat: 0.3 },
    });
    const now = new Date(2026, 4, 11, 18).getTime();
    const day = 86_400_000;
    await logFood({ foodId: food.id, amountG: 200, mealType: 'lunch', date: now - 2 * day });
    await logFood({ foodId: food.id, amountG: 100, mealType: 'lunch', date: now });
    await logWater(1000, now);

    const buckets = await weeklyTotals(now, 7);
    expect(buckets).toHaveLength(7);
    expect(buckets[buckets.length - 1].totals.waterMl).toBe(1000);
    expect(buckets[buckets.length - 1].totals.macros.kcal).toBeCloseTo(67, 5);
    expect(buckets[buckets.length - 3].totals.macros.kcal).toBeCloseTo(67 * 2, 5);
    expect(buckets[0].totals.macros.kcal).toBe(0);
  });
});

describe('dailyKcalWithLogFlag', () => {
  it('flags days with a real food-log entry and reports the kcal total, oldest → newest', async () => {
    const food = await saveFood({ name: 'Q2', per100g: { kcal: 50, protein: 5, carbs: 5, fat: 1 } });
    const now = new Date(2026, 4, 11, 18).getTime();
    const day = 86_400_000;
    await logFood({ foodId: food.id, amountG: 200, mealType: 'lunch', date: now - 2 * day }); // 100 kcal
    await logWater(500, now); // water-only day — no foodLog row

    const rows = await dailyKcalWithLogFlag(now, 7);
    expect(rows).toHaveLength(7);
    expect(rows[rows.length - 3].hasLog).toBe(true);
    expect(rows[rows.length - 3].kcal).toBeCloseTo(100, 5);
    expect(rows[rows.length - 1].hasLog).toBe(false);
    expect(rows[rows.length - 1].kcal).toBe(0);
  });
});

describe('buildDigestStats', () => {
  const targets: DailyTargets = { kcal: 2200, proteinG: 180, carbsG: 220, fatG: 70, waterMl: 3000 };
  const DAY = 86_400_000;

  function mkDay(kcal: number, protein: number): WeeklyDay {
    return { dayStart: 0, totals: { macros: { kcal, protein, carbs: 0, fat: 0 }, waterMl: 0 } };
  }

  it('averages kcal/protein across all days and computes adherence percentages', () => {
    const week = [mkDay(2000, 150), mkDay(2200, 180), mkDay(0, 0), mkDay(2400, 200)];
    const stats = buildDigestStats(week, targets, null, null);
    expect(stats.totalDays).toBe(4);
    expect(stats.daysWithLog).toBe(3);
    expect(stats.avgKcal).toBeCloseTo((2000 + 2200 + 0 + 2400) / 4, 5);
    expect(stats.kcalAdherencePercent).toBeCloseTo((stats.avgKcal / 2200) * 100, 5);
    expect(stats.avgProteinG).toBeCloseTo((150 + 180 + 0 + 200) / 4, 5);
    expect(stats.proteinAdherencePercent).toBeCloseTo((stats.avgProteinG / 180) * 100, 5);
  });

  it('passes through the weight trend and TDEE estimate when provided', () => {
    const weightTrend: WeightTrend = { latestKg: 79, latestDate: 40 * DAY, deltaKg: -1, comparedToDate: 10 * DAY };
    const stats = buildDigestStats([mkDay(2200, 180)], targets, weightTrend, 2750);
    expect(stats.weightChangeKg).toBe(-1);
    expect(stats.weightTrendDays).toBe(30);
    expect(stats.tdeeEstimateKcal).toBe(2750);
  });

  it('returns nulls for weight-trend fields when no trend is available', () => {
    const stats = buildDigestStats([mkDay(2200, 180)], targets, null, null);
    expect(stats.weightChangeKg).toBeNull();
    expect(stats.weightTrendDays).toBeNull();
    expect(stats.tdeeEstimateKcal).toBeNull();
  });
});
