import { describe, expect, it } from 'vitest';
import {
  computeAdjustedTargets,
  deriveInitialGoalOffset,
  estimateTdee,
  linearRegressionSlope,
  RECALC_INTERVAL_MS,
  shouldRecalcTdee,
  type IntakeDay,
  type WeightPoint,
} from '../adaptiveTdee';
import type { DailyTargets } from '../../db/schema';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('linearRegressionSlope', () => {
  it('returns the exact slope for a perfectly linear series', () => {
    expect(linearRegressionSlope([{ x: 0, y: 80 }, { x: 1, y: 81 }, { x: 2, y: 82 }])).toBeCloseTo(1, 10);
  });

  it('returns 0 for fewer than 2 points', () => {
    expect(linearRegressionSlope([])).toBe(0);
    expect(linearRegressionSlope([{ x: 0, y: 80 }])).toBe(0);
  });

  it('returns 0 when all points share the same x (zero variance)', () => {
    expect(linearRegressionSlope([{ x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }])).toBe(0);
  });

  it('finds the least-squares slope for a noisy series', () => {
    // y = 2x + noise; the noise should average out close to slope 2.
    const points = [{ x: 0, y: 0 }, { x: 1, y: 2.2 }, { x: 2, y: 3.8 }, { x: 3, y: 6.1 }];
    expect(linearRegressionSlope(points)).toBeCloseTo(2, 0);
  });
});

function intakeDays(kcalValues: number[]): IntakeDay[] {
  return kcalValues.map((kcal, i) => ({ date: i * DAY_MS, kcal }));
}

describe('estimateTdee', () => {
  const cleanWeightPoints: WeightPoint[] = [
    { date: 0, weightKg: 80 },
    { date: 7 * DAY_MS, weightKg: 79.5 },
    { date: 14 * DAY_MS, weightKg: 79 },
  ];

  it('returns insufficient_weight_data when fewer than MIN_WEIGHT_ENTRIES points exist', () => {
    const result = estimateTdee({
      weightPoints: [{ date: 0, weightKg: 80 }, { date: 14 * DAY_MS, weightKg: 79 }],
      intakeDays: intakeDays(new Array(10).fill(2200)),
    });
    expect(result.status).toBe('insufficient_weight_data');
    expect(result.estimatedTdeeKcal).toBeNull();
    expect(result.weightEntryCount).toBe(2);
  });

  it('returns insufficient_weight_data when entries are clustered in too short a span', () => {
    const result = estimateTdee({
      weightPoints: [
        { date: 0, weightKg: 80 },
        { date: 1 * DAY_MS, weightKg: 79.9 },
        { date: 2 * DAY_MS, weightKg: 79.8 },
      ],
      intakeDays: intakeDays(new Array(10).fill(2200)),
    });
    expect(result.status).toBe('insufficient_weight_data');
    expect(result.weightSpanDays).toBe(2);
  });

  it('returns insufficient_intake_data when too few days were logged', () => {
    const result = estimateTdee({
      weightPoints: cleanWeightPoints,
      intakeDays: intakeDays([2100, 2200, 2300, 2250, 2150]), // 5 days, < MIN_LOGGED_INTAKE_DAYS (7)
    });
    expect(result.status).toBe('insufficient_intake_data');
    expect(result.estimatedTdeeKcal).toBeNull();
    expect(result.avgIntakeKcal).toBeCloseTo(2200, 5);
  });

  it('computes a clean ok estimate for a perfectly linear weight-loss trend', () => {
    const result = estimateTdee({
      weightPoints: cleanWeightPoints,
      intakeDays: intakeDays(new Array(10).fill(2200)),
    });
    expect(result.status).toBe('ok');
    // slope = -1kg / 14 days; weekly change = -0.5 kg/week.
    expect(result.weightChangeKgPerWeek).toBeCloseTo(-0.5, 6);
    expect(result.avgIntakeKcal).toBeCloseTo(2200, 6);
    // estimatedTdee = 2200 - (-1/14 * 7700) = 2200 + 550 = 2750.
    expect(result.estimatedTdeeKcal).toBe(2750);
  });

  it('computes a clean ok estimate for a weight-gain trend (surplus implies lower TDEE)', () => {
    const gainingPoints: WeightPoint[] = [
      { date: 0, weightKg: 79 },
      { date: 7 * DAY_MS, weightKg: 79.5 },
      { date: 14 * DAY_MS, weightKg: 80 },
    ];
    const result = estimateTdee({
      weightPoints: gainingPoints,
      intakeDays: intakeDays(new Array(10).fill(2200)),
    });
    expect(result.status).toBe('ok');
    expect(result.weightChangeKgPerWeek).toBeCloseTo(0.5, 6);
    // estimatedTdee = 2200 - (1/14 * 7700) = 2200 - 550 = 1650.
    expect(result.estimatedTdeeKcal).toBe(1650);
  });

  it('scales the minimum-data thresholds proportionally when windowDays is injected', () => {
    // With a 7-day window, required span/logged-day thresholds halve (5, 3.5→4).
    const result = estimateTdee({
      weightPoints: [
        { date: 0, weightKg: 80 },
        { date: 3 * DAY_MS, weightKg: 79.8 },
        { date: 6 * DAY_MS, weightKg: 79.6 },
      ],
      intakeDays: intakeDays([2200, 2200, 2200, 2200]),
      windowDays: 7,
    });
    expect(result.status).toBe('ok');
  });

  it('is unaffected by weight points passed out of order', () => {
    const shuffled = [cleanWeightPoints[2], cleanWeightPoints[0], cleanWeightPoints[1]];
    const result = estimateTdee({ weightPoints: shuffled, intakeDays: intakeDays(new Array(10).fill(2200)) });
    expect(result.status).toBe('ok');
    expect(result.estimatedTdeeKcal).toBe(2750);
  });
});

describe('deriveInitialGoalOffset', () => {
  it('captures the deficit/surplus between the current target and the estimated TDEE', () => {
    const targets: DailyTargets = { kcal: 2200, proteinG: 180, carbsG: 220, fatG: 70, waterMl: 3000 };
    expect(deriveInitialGoalOffset(targets, 2600)).toBe(-400);
    expect(deriveInitialGoalOffset(targets, 2000)).toBe(200);
  });
});

describe('computeAdjustedTargets', () => {
  const targets: DailyTargets = { kcal: 2200, proteinG: 180, carbsG: 220, fatG: 70, waterMl: 3000 };

  it('keeps protein and water fixed, re-splits carbs/fat proportionally to the current ratio', () => {
    const result = computeAdjustedTargets(targets, 2750, -400);
    expect(result.proposedKcal).toBe(2350);
    expect(result.proposedProteinG).toBe(180);
    expect(result.proposedWaterMl).toBe(3000);
    expect(result.deltaKcal).toBe(150);
    expect(result.proposedCarbsG).toBe(237);
    expect(result.proposedFatG).toBe(76);
  });

  it('clamps remaining kcal to zero when protein alone exceeds the proposed target', () => {
    const highProteinTargets: DailyTargets = { kcal: 1000, proteinG: 300, carbsG: 50, fatG: 20, waterMl: 2000 };
    const result = computeAdjustedTargets(highProteinTargets, 1000, 0);
    expect(result.proposedKcal).toBe(1000);
    expect(result.proposedProteinG).toBe(300);
    expect(result.proposedCarbsG).toBe(0);
    expect(result.proposedFatG).toBe(0);
    expect(result.deltaKcal).toBe(0);
  });

  it('falls back to a 60/40 carb/fat split when the current targets have zero non-protein kcal', () => {
    const zeroCarbFat: DailyTargets = { kcal: 720, proteinG: 180, carbsG: 0, fatG: 0, waterMl: 3000 };
    const result = computeAdjustedTargets(zeroCarbFat, 2000, 0);
    expect(result.proposedKcal).toBe(2000);
    const remainingKcal = 2000 - 180 * 4;
    expect(result.proposedCarbsG).toBe(Math.round((remainingKcal * 0.6) / 4));
    expect(result.proposedFatG).toBe(Math.round((remainingKcal * 0.4) / 9));
  });
});

describe('shouldRecalcTdee', () => {
  it('returns true when never recalculated (null or undefined)', () => {
    expect(shouldRecalcTdee(null, 1_000_000)).toBe(true);
    expect(shouldRecalcTdee(undefined, 1_000_000)).toBe(true);
  });

  it('returns false just before the weekly interval elapses', () => {
    const now = 10_000_000;
    expect(shouldRecalcTdee(now - (RECALC_INTERVAL_MS - 1), now)).toBe(false);
  });

  it('returns true exactly at the weekly interval boundary', () => {
    const now = 10_000_000;
    expect(shouldRecalcTdee(now - RECALC_INTERVAL_MS, now)).toBe(true);
  });

  it('returns true well past the weekly interval', () => {
    const now = 10_000_000;
    expect(shouldRecalcTdee(now - RECALC_INTERVAL_MS * 3, now)).toBe(true);
  });
});
