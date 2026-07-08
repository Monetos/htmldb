// DB-touching orchestrator for plateau detection: aggregates across all
// exercises for the ProgressPage summary, and owns the dismiss/re-surface
// persistence (a small Record on the existing Settings singleton row, no
// new Dexie table). Mirrors the tdeeService.ts split between pure math
// (src/lib/plateauDetection.ts) and DB orchestration (this file).

import { db, ensureSettings } from '../../db/database';
import type { SetEntry } from '../../db/schema';
import { latestWeightTrend } from '../body/bodyLib';
import { buildDigestStats, weeklyTotals, type WeeklyDigestStats } from '../nutrition/nutritionLib';
import {
  detectPlateau,
  isPlateauDismissalStale,
  perWorkoutBestE1rm,
  PLATEAU_CURRENT_WINDOW,
  type PlateauResult,
  type WorkoutStrengthPoint,
} from '../../lib/plateauDetection';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_NUTRITION_SPAN_DAYS = 84;

export interface ExercisePlateauEntry {
  exerciseId: string;
  exerciseName: string;
  plateauResult: PlateauResult;
  latestPointStartedAt: number | null;
  isDismissed: boolean;
}

export async function computeAllExercisePlateaus(now: number = Date.now()): Promise<ExercisePlateauEntry[]> {
  // Read-only db.settings.get — never ensureSettings() here: this function is used as a
  // useLiveQuery querier, and Dexie's liveQuery forbids opening a readwrite transaction
  // (which ensureSettings does on first-ever load) from within its read-only context.
  const [exercises, sets, workouts, settings] = await Promise.all([
    db.exercises.toArray(),
    db.sets.toArray(),
    db.workouts.toArray(),
    db.settings.get('singleton'),
  ]);
  const workoutsById = new Map(workouts.filter((w) => w.startedAt <= now).map((w) => [w.id, w]));
  const setsByExercise = new Map<string, SetEntry[]>();
  for (const s of sets) {
    const slot = setsByExercise.get(s.exerciseId) ?? [];
    slot.push(s);
    setsByExercise.set(s.exerciseId, slot);
  }
  const dismissed = settings?.dismissedPlateaus ?? {};

  const entries: ExercisePlateauEntry[] = [];
  for (const exercise of exercises) {
    const exerciseSets = setsByExercise.get(exercise.id) ?? [];
    if (exerciseSets.length === 0) continue;
    const points = perWorkoutBestE1rm(exerciseSets, workoutsById);
    const plateauResult = detectPlateau(points);
    const latestPointStartedAt = points.length > 0 ? points[points.length - 1].startedAt : null;
    const dismissal = dismissed[exercise.id];
    const isDismissed =
      dismissal !== undefined &&
      latestPointStartedAt !== null &&
      !isPlateauDismissalStale(dismissal.dismissedAt, latestPointStartedAt);
    entries.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      plateauResult,
      latestPointStartedAt,
      isDismissed,
    });
  }
  return entries;
}

/** Pure filter/sort: undismissed, currently plateaued or regressing, regressing first. */
export function actionablePlateaus(entries: ExercisePlateauEntry[]): ExercisePlateauEntry[] {
  return entries
    .filter(
      (e) =>
        !e.isDismissed &&
        (e.plateauResult.status === 'plateaued' || e.plateauResult.status === 'regressing'),
    )
    .sort((a, b) => {
      if (a.plateauResult.status === b.plateauResult.status) return 0;
      return a.plateauResult.status === 'regressing' ? -1 : 1;
    });
}

export async function dismissPlateau(exerciseId: string): Promise<void> {
  const settings = await ensureSettings();
  const dismissedPlateaus = {
    ...(settings.dismissedPlateaus ?? {}),
    [exerciseId]: { dismissedAt: Date.now() },
  };
  await db.settings.update('singleton', { dismissedPlateaus, updatedAt: Date.now() });
}

/** Read-only (see computeAllExercisePlateaus) — also safe to use as a useLiveQuery querier. */
export async function isPlateauCurrentlyDismissed(
  exerciseId: string,
  latestPointStartedAt: number,
): Promise<boolean> {
  const settings = await db.settings.get('singleton');
  const dismissal = settings?.dismissedPlateaus?.[exerciseId];
  if (!dismissal) return false;
  return !isPlateauDismissalStale(dismissal.dismissedAt, latestPointStartedAt);
}

/**
 * Nutrition stats spanning the plateau's own current window (capped at ~12
 * weeks) instead of the fixed 7-day week the weekly-digest feature uses —
 * reuses buildDigestStats directly rather than a bespoke summary.
 */
export async function nutritionStatsForPlateauWindow(
  points: WorkoutStrengthPoint[],
  now: number,
): Promise<WeeklyDigestStats> {
  const settings = await ensureSettings();
  const currentSlice = points.slice(-PLATEAU_CURRENT_WINDOW);
  const firstStartedAt = currentSlice.length > 0 ? currentSlice[0].startedAt : now;
  const spanDays = Math.min(
    MAX_NUTRITION_SPAN_DAYS,
    Math.max(1, Math.ceil((now - firstStartedAt) / DAY_MS)),
  );
  const [week, weightTrend] = await Promise.all([weeklyTotals(now, spanDays), latestWeightTrend(now)]);
  return buildDigestStats(week, settings.dailyTargets, weightTrend, settings.lastTdeeEstimateKcal ?? null);
}
