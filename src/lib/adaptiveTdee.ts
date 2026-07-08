// Pure adaptive-TDEE math: energy-balance backsolve (avg logged intake minus
// the kcal implied by the measured weight-change slope) using an OLS
// regression over the weight trend rather than a noisy two-point delta. No DB
// access here — src/features/nutrition/tdeeService.ts fetches the rows and
// calls into this module, mirroring the split already used in progression.ts.

import type { DailyTargets } from '../db/schema';

const DAY_MS = 24 * 60 * 60 * 1000;

export const TDEE_WINDOW_DAYS = 14;
/** ~3500 kcal/lb fat-tissue energy density, rounded to the metric equivalent. */
export const KCAL_PER_KG = 7700;
export const MIN_WEIGHT_ENTRIES = 3;
export const MIN_WEIGHT_SPAN_DAYS = 10;
export const MIN_LOGGED_INTAKE_DAYS = 7;
export const RECALC_INTERVAL_MS = 7 * DAY_MS;

export interface WeightPoint {
  date: number;
  weightKg: number;
}

/** One entry per day that has at least one real food-log row — never a zero-fill for unlogged days. */
export interface IntakeDay {
  date: number;
  kcal: number;
}

export type TdeeEstimateStatus = 'ok' | 'insufficient_weight_data' | 'insufficient_intake_data';

export interface TdeeEstimateInput {
  weightPoints: WeightPoint[];
  intakeDays: IntakeDay[];
  /** Defaults to TDEE_WINDOW_DAYS; scales the minimum-data thresholds proportionally when injected. */
  windowDays?: number;
}

export interface TdeeEstimateResult {
  status: TdeeEstimateStatus;
  estimatedTdeeKcal: number | null;
  avgIntakeKcal: number | null;
  weightChangeKgPerWeek: number | null;
  loggedDayCount: number;
  weightEntryCount: number;
  weightSpanDays: number | null;
}

/** Least-squares slope of y over x. Returns 0 for fewer than 2 points or zero x-variance. */
export function linearRegressionSlope(points: { x: number; y: number }[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += (p.x - meanX) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

export function estimateTdee(input: TdeeEstimateInput): TdeeEstimateResult {
  const windowDays = input.windowDays ?? TDEE_WINDOW_DAYS;
  const scale = windowDays / TDEE_WINDOW_DAYS;
  const requiredSpanDays = Math.round(MIN_WEIGHT_SPAN_DAYS * scale);
  const requiredLoggedDays = Math.round(MIN_LOGGED_INTAKE_DAYS * scale);

  const weightPoints = [...input.weightPoints].sort((a, b) => a.date - b.date);
  const weightEntryCount = weightPoints.length;
  const weightSpanDays =
    weightEntryCount >= 2
      ? (weightPoints[weightPoints.length - 1].date - weightPoints[0].date) / DAY_MS
      : weightEntryCount === 1
        ? 0
        : null;

  const loggedDayCount = input.intakeDays.length;
  const avgIntakeKcal =
    loggedDayCount > 0
      ? input.intakeDays.reduce((sum, d) => sum + d.kcal, 0) / loggedDayCount
      : null;

  if (weightEntryCount < MIN_WEIGHT_ENTRIES || weightSpanDays === null || weightSpanDays < requiredSpanDays) {
    return {
      status: 'insufficient_weight_data',
      estimatedTdeeKcal: null,
      avgIntakeKcal,
      weightChangeKgPerWeek: null,
      loggedDayCount,
      weightEntryCount,
      weightSpanDays,
    };
  }

  if (loggedDayCount < requiredLoggedDays || avgIntakeKcal === null) {
    return {
      status: 'insufficient_intake_data',
      estimatedTdeeKcal: null,
      avgIntakeKcal,
      weightChangeKgPerWeek: null,
      loggedDayCount,
      weightEntryCount,
      weightSpanDays,
    };
  }

  const anchor = weightPoints[0].date;
  const regressionPoints = weightPoints.map((p) => ({ x: (p.date - anchor) / DAY_MS, y: p.weightKg }));
  const slopeKgPerDay = linearRegressionSlope(regressionPoints);
  const weightChangeKgPerWeek = slopeKgPerDay * 7;
  const estimatedTdeeKcal = avgIntakeKcal - slopeKgPerDay * KCAL_PER_KG;

  return {
    status: 'ok',
    estimatedTdeeKcal: Math.round(estimatedTdeeKcal),
    avgIntakeKcal,
    weightChangeKgPerWeek,
    loggedDayCount,
    weightEntryCount,
    weightSpanDays,
  };
}

export interface TdeeTargetAdjustment {
  proposedKcal: number;
  proposedProteinG: number;
  proposedCarbsG: number;
  proposedFatG: number;
  proposedWaterMl: number;
  deltaKcal: number;
}

/** Captures how far the user's existing manual target sits from true maintenance, the first time this ever runs. */
export function deriveInitialGoalOffset(currentTargets: DailyTargets, estimatedTdeeKcal: number): number {
  return currentTargets.kcal - estimatedTdeeKcal;
}

/**
 * Protein stays fixed (tracks lean mass, not energy balance). Carbs/fat are
 * re-split from the remaining kcal, preserving the user's current carb:fat
 * calorie-share ratio rather than resetting to a fixed split. Water is
 * untouched (unrelated to energy balance).
 */
export function computeAdjustedTargets(
  currentTargets: DailyTargets,
  estimatedTdeeKcal: number,
  goalOffsetKcal: number,
): TdeeTargetAdjustment {
  const proposedKcal = Math.max(0, Math.round(estimatedTdeeKcal + goalOffsetKcal));
  const proteinKcal = currentTargets.proteinG * 4;
  const remainingKcal = Math.max(0, proposedKcal - proteinKcal);

  const currentCarbsKcal = currentTargets.carbsG * 4;
  const currentFatKcal = currentTargets.fatG * 9;
  const currentNonProteinKcal = currentCarbsKcal + currentFatKcal;
  const carbShare = currentNonProteinKcal > 0 ? currentCarbsKcal / currentNonProteinKcal : 0.6;

  const proposedCarbsKcal = remainingKcal * carbShare;
  const proposedFatKcal = remainingKcal - proposedCarbsKcal;

  return {
    proposedKcal,
    proposedProteinG: currentTargets.proteinG,
    proposedCarbsG: Math.round(proposedCarbsKcal / 4),
    proposedFatG: Math.round(proposedFatKcal / 9),
    proposedWaterMl: currentTargets.waterMl,
    deltaKcal: proposedKcal - currentTargets.kcal,
  };
}

/** Weekly cadence gate: true if never recalculated, or at least RECALC_INTERVAL_MS has elapsed. */
export function shouldRecalcTdee(lastRecalcAt: number | null | undefined, now: number): boolean {
  if (lastRecalcAt == null) return true;
  return now - lastRecalcAt >= RECALC_INTERVAL_MS;
}
