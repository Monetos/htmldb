// DB-touching orchestration for adaptive TDEE: fetches the rows adaptiveTdee.ts
// needs, persists the resulting suggestion, and applies/discards it on user
// confirmation. All target-changing writes go through acceptTdeeAdjustment —
// nothing here ever writes dailyTargets on its own.

import { db, ensureSettings } from '../../db/database';
import type { Settings, TdeeAdjustmentSuggestion } from '../../db/schema';
import {
  computeAdjustedTargets,
  deriveInitialGoalOffset,
  estimateTdee,
  shouldRecalcTdee,
  TDEE_WINDOW_DAYS,
  type IntakeDay,
  type TdeeEstimateResult,
  type WeightPoint,
} from '../../lib/adaptiveTdee';
import { dailyKcalWithLogFlag } from './nutritionLib';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Read-only: fetches the current window's rows and runs the pure estimator, without writing anything. */
export async function computeCurrentTdeeEstimate(now: number): Promise<TdeeEstimateResult> {
  const windowStart = now - TDEE_WINDOW_DAYS * DAY_MS;
  const metricRows = await db.bodyMetrics.where('date').between(windowStart, now, true, true).toArray();
  const weightPoints: WeightPoint[] = metricRows
    .filter((m): m is typeof m & { weightKg: number } => typeof m.weightKg === 'number')
    .map((m) => ({ date: m.date, weightKg: m.weightKg }));

  const dailyKcal = await dailyKcalWithLogFlag(now, TDEE_WINDOW_DAYS);
  const intakeDays: IntakeDay[] = dailyKcal
    .filter((d) => d.hasLog)
    .map((d) => ({ date: d.date, kcal: d.kcal }));

  return estimateTdee({ weightPoints, intakeDays });
}

export async function setAdaptiveTdeeEnabled(enabled: boolean): Promise<void> {
  await ensureSettings();
  await db.settings.update('singleton', { adaptiveTdeeEnabled: enabled, updatedAt: Date.now() });
}

/** Turns the feature on and immediately runs a first check, instead of making the user wait up to a week for feedback. */
export async function enableAdaptiveTdee(): Promise<void> {
  await setAdaptiveTdeeEnabled(true);
  await maybeRecalcTdee(Date.now(), { force: true });
}

export interface MaybeRecalcOptions {
  /** Bypasses the weekly cadence gate — used right after enabling, and by the manual "Jetzt neu berechnen" button. */
  force?: boolean;
}

/**
 * Runs the adaptive-TDEE check if the feature is enabled and the weekly gate
 * allows it (or `force` is set). Always stamps lastTdeeRecalcAt on an actual
 * attempt so the weekly cadence advances even when data is insufficient.
 */
export async function maybeRecalcTdee(now: number, options: MaybeRecalcOptions = {}): Promise<void> {
  const settings = await ensureSettings();
  if (!settings.adaptiveTdeeEnabled) return;
  if (!options.force && !shouldRecalcTdee(settings.lastTdeeRecalcAt, now)) return;

  const result = await computeCurrentTdeeEstimate(now);

  const patch: Partial<Settings> = { lastTdeeRecalcAt: now, updatedAt: now };

  if (result.status === 'ok' && result.estimatedTdeeKcal !== null) {
    const goalOffsetKcal =
      settings.tdeeGoalOffsetKcal ?? deriveInitialGoalOffset(settings.dailyTargets, result.estimatedTdeeKcal);
    if (settings.tdeeGoalOffsetKcal === undefined) {
      patch.tdeeGoalOffsetKcal = goalOffsetKcal;
    }
    patch.lastTdeeEstimateKcal = result.estimatedTdeeKcal;

    const adjustment = computeAdjustedTargets(settings.dailyTargets, result.estimatedTdeeKcal, goalOffsetKcal);
    if (adjustment.deltaKcal !== 0) {
      const suggestion: TdeeAdjustmentSuggestion = {
        proposedKcal: adjustment.proposedKcal,
        proposedProteinG: adjustment.proposedProteinG,
        proposedCarbsG: adjustment.proposedCarbsG,
        proposedFatG: adjustment.proposedFatG,
        proposedWaterMl: adjustment.proposedWaterMl,
        estimatedTdeeKcal: result.estimatedTdeeKcal,
        previousKcal: settings.dailyTargets.kcal,
        computedAt: now,
      };
      patch.pendingTdeeAdjustment = suggestion;
    } else {
      // Targets already match the fresh estimate — clear any stale suggestion from a prior cycle.
      patch.pendingTdeeAdjustment = undefined;
    }
  }

  await db.settings.update('singleton', patch);
}

export async function acceptTdeeAdjustment(): Promise<void> {
  const settings = await ensureSettings();
  const pending = settings.pendingTdeeAdjustment;
  if (!pending) return;
  await db.settings.update('singleton', {
    dailyTargets: {
      kcal: pending.proposedKcal,
      proteinG: pending.proposedProteinG,
      carbsG: pending.proposedCarbsG,
      fatG: pending.proposedFatG,
      waterMl: pending.proposedWaterMl,
    },
    pendingTdeeAdjustment: undefined,
    updatedAt: Date.now(),
  });
}

export async function rejectTdeeAdjustment(): Promise<void> {
  await ensureSettings();
  await db.settings.update('singleton', { pendingTdeeAdjustment: undefined, updatedAt: Date.now() });
}

/** Persists the AI-generated explanation text onto the currently pending suggestion, if any. */
export async function attachTdeeExplanation(explanation: string): Promise<void> {
  const settings = await ensureSettings();
  const pending = settings.pendingTdeeAdjustment;
  if (!pending) return;
  await db.settings.update('singleton', {
    pendingTdeeAdjustment: { ...pending, explanation },
    updatedAt: Date.now(),
  });
}
