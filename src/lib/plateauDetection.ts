// Pure strength-plateau detection: compares the best estimated-1RM shown in
// the last N workouts against the N workouts before that, windowed by
// workout count (not calendar time) since perWorkoutExerciseStats-shaped
// points are irregularly spaced by session, not by day. Mirrors the
// "current bucket vs. mean of prior buckets" shape of
// progression.ts's muscleAmpelFromWeeks, but per-workout and MAX-based
// instead of week-bucketed and MEAN-based (see detectPlateau doc comment
// for why). Deliberately not added to progression.ts itself — kept
// self-contained so no existing math there is touched.

import type { SetEntry, Workout } from '../db/schema';
import { estimatedOneRm } from './progression';

export interface WorkoutStrengthPoint {
  workoutId: string;
  startedAt: number;
  bestE1rmKg: number;
  volumeKg: number;
}

/**
 * For one exercise: groups sets by workout and reports the best estimated
 * 1RM (Epley, max over that workout's working sets) + total volume per
 * workout, oldest → newest. Warmup sets are excluded. Structurally mirrors
 * perWorkoutExerciseStats, but tracks the best e1RM instead of the raw top
 * weight, so a low-rep heavy single and a high-rep back-off top set land on
 * a comparable strength scale instead of being compared as raw kg.
 */
export function perWorkoutBestE1rm(
  sets: SetEntry[],
  workoutsById: Map<string, Workout>,
): WorkoutStrengthPoint[] {
  const byWorkout = new Map<string, SetEntry[]>();
  for (const s of sets) {
    if (s.isWarmup) continue;
    if (s.weightKg <= 0 || s.reps <= 0) continue;
    const slot = byWorkout.get(s.workoutId) ?? [];
    slot.push(s);
    byWorkout.set(s.workoutId, slot);
  }
  const points: WorkoutStrengthPoint[] = [];
  for (const [workoutId, ws] of byWorkout.entries()) {
    const w = workoutsById.get(workoutId);
    if (!w) continue;
    const bestE1rmKg = ws.reduce((m, s) => Math.max(m, estimatedOneRm(s.weightKg, s.reps)), 0);
    const volumeKg = ws.reduce((acc, s) => acc + s.weightKg * s.reps, 0);
    points.push({ workoutId, startedAt: w.startedAt, bestE1rmKg, volumeKg });
  }
  points.sort((a, b) => a.startedAt - b.startedAt);
  return points;
}

export const PLATEAU_CURRENT_WINDOW = 6;
export const PLATEAU_BASELINE_WINDOW = 6;
export const PLATEAU_MARGIN = 0.025;
export const PLATEAU_MIN_POINTS = PLATEAU_CURRENT_WINDOW + PLATEAU_BASELINE_WINDOW;

export type PlateauStatus = 'progressing' | 'plateaued' | 'regressing' | 'insufficient_data';

export interface PlateauResult {
  status: PlateauStatus;
  currentBestE1rmKg: number | null;
  baselineBestE1rmKg: number | null;
  currentWindowWorkouts: number;
  baselineWindowWorkouts: number;
  totalWorkoutsConsidered: number;
}

/**
 * Compares the max e1RM across the last PLATEAU_CURRENT_WINDOW workouts
 * against the max e1RM across the PLATEAU_BASELINE_WINDOW workouts directly
 * before that. Requires both windows full (12 points total) — no
 * partial-baseline fallback, since a strength baseline built from fewer
 * than 6 sessions is too noisy to trust as "what you could already do".
 *
 * MAX (not mean) per window: a mean would let a single bad-sleep session
 * drag the window down, or a single lucky PR attempt pull it up — neither
 * reflects real current capability. Max answers "what's the best I've
 * shown recently, vs. what's the best I showed before that", which is
 * naturally robust to any one unrepresentative session.
 *
 * ±2.5% margin (far tighter than muscleAmpelFromWeeks's ±20%, which governs
 * inherently noisy weekly training volume): e1RM is a much more stable,
 * slowly-changing quantity for a given lifter/exercise — a 20% swing would
 * be near-impossible outside injury, so a 20% band would never fire. 2.5%
 * is wide enough to absorb Epley-formula noise between differing rep
 * schemes (e.g. a small microplate jump) without letting real stagnation
 * pass as "still progressing".
 */
export function detectPlateau(points: WorkoutStrengthPoint[]): PlateauResult {
  const totalWorkoutsConsidered = points.length;
  if (points.length < PLATEAU_MIN_POINTS) {
    return {
      status: 'insufficient_data',
      currentBestE1rmKg: null,
      baselineBestE1rmKg: null,
      currentWindowWorkouts: 0,
      baselineWindowWorkouts: 0,
      totalWorkoutsConsidered,
    };
  }

  const currentSlice = points.slice(-PLATEAU_CURRENT_WINDOW);
  const baselineSlice = points.slice(-PLATEAU_MIN_POINTS, -PLATEAU_CURRENT_WINDOW);

  const currentBestE1rmKg = currentSlice.reduce((m, p) => Math.max(m, p.bestE1rmKg), 0);
  const baselineBestE1rmKg = baselineSlice.reduce((m, p) => Math.max(m, p.bestE1rmKg), 0);

  let status: PlateauStatus;
  if (currentBestE1rmKg > baselineBestE1rmKg * (1 + PLATEAU_MARGIN)) {
    status = 'progressing';
  } else if (currentBestE1rmKg < baselineBestE1rmKg * (1 - PLATEAU_MARGIN)) {
    status = 'regressing';
  } else {
    status = 'plateaued';
  }

  return {
    status,
    currentBestE1rmKg,
    baselineBestE1rmKg,
    currentWindowWorkouts: currentSlice.length,
    baselineWindowWorkouts: baselineSlice.length,
    totalWorkoutsConsidered,
  };
}

/** True once a workout for this exercise has been logged after the dismissal — the callout reappears and gets re-judged on fresh data. */
export function isPlateauDismissalStale(dismissedAt: number, latestPointStartedAt: number): boolean {
  return latestPointStartedAt > dismissedAt;
}
