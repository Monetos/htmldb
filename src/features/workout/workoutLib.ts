import { db } from '../../db/database';
import type { Exercise, SetEntry, UnilateralSide, Workout } from '../../db/schema';
import { newId } from '../../lib/id';
import { addWeeks, prBreakingSetsInWorkout, startOfIsoWeek, type PrCategory } from '../../lib/progression';

/**
 * Returns the currently active (= unfinished) workout, or `null` if none.
 * Use `null` (not `undefined`) so callers can distinguish "still loading"
 * from "resolved → no active workout" in useLiveQuery results.
 */
export async function getActiveWorkout(): Promise<Workout | null> {
  const recent = await db.workouts.orderBy('startedAt').reverse().limit(10).toArray();
  return recent.find((w) => !w.finishedAt) ?? null;
}

export async function startFreeWorkout(): Promise<Workout> {
  const existing = await getActiveWorkout();
  if (existing) return existing;
  const now = Date.now();
  const workout: Workout = {
    id: newId(),
    date: now,
    startedAt: now,
  };
  await db.workouts.add(workout);
  return workout;
}

export async function finishWorkout(
  id: string,
  data: { notes?: string; bodyweightKg?: number },
): Promise<void> {
  await db.workouts.update(id, {
    finishedAt: Date.now(),
    notes: data.notes,
    bodyweightKg: data.bodyweightKg,
  });
}

export async function addSet(input: {
  workoutId: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  rpe?: number;
  isWarmup: boolean;
  isDropSet?: boolean;
  toFailure?: boolean;
  unilateralSide?: UnilateralSide;
}): Promise<SetEntry> {
  // Determine next set number for this (workout, exercise).
  const existing = await db.sets
    .where('workoutId')
    .equals(input.workoutId)
    .filter((s) => s.exerciseId === input.exerciseId)
    .toArray();
  const set: SetEntry = {
    id: newId(),
    workoutId: input.workoutId,
    exerciseId: input.exerciseId,
    setNumber: existing.length + 1,
    weightKg: input.weightKg,
    reps: input.reps,
    rpe: input.rpe,
    isWarmup: input.isWarmup,
    isDropSet: input.isDropSet ?? false,
    toFailure: input.toFailure ?? false,
    unilateralSide: input.unilateralSide,
    completedAt: Date.now(),
  };
  await db.sets.add(set);
  return set;
}

export async function deleteSet(id: string): Promise<void> {
  await db.sets.delete(id);
}

/**
 * Bulk-inserts generated warmup sets, bypassing the single-row draft UI.
 * Sequential await — addSet re-queries existing sets each call to compute
 * setNumber, so this appends correctly after whatever is already logged.
 */
export async function bulkAddWarmupSets(
  workoutId: string,
  exerciseId: string,
  steps: { weightKg: number }[],
): Promise<SetEntry[]> {
  const created: SetEntry[] = [];
  for (const step of steps) {
    created.push(await addSet({ workoutId, exerciseId, weightKg: step.weightKg, reps: 5, isWarmup: true }));
  }
  return created;
}

/** Most recent set across any workout for the given exercise. */
export async function lastSetForExercise(
  exerciseId: string,
  excludeWorkoutId?: string,
): Promise<SetEntry | undefined> {
  const rows = await db.sets
    .where('exerciseId')
    .equals(exerciseId)
    .reverse()
    .sortBy('completedAt');
  return rows.find((s) => s.workoutId !== excludeWorkoutId);
}

/** All sets of the latest *finished* workout that included the exercise. */
export async function lastWorkoutSetsForExercise(
  exerciseId: string,
  excludeWorkoutId?: string,
): Promise<{ workout: Workout; sets: SetEntry[] } | null> {
  const all = await db.sets.where('exerciseId').equals(exerciseId).toArray();
  const byWorkout = new Map<string, SetEntry[]>();
  for (const s of all) {
    if (s.workoutId === excludeWorkoutId) continue;
    const list = byWorkout.get(s.workoutId) ?? [];
    list.push(s);
    byWorkout.set(s.workoutId, list);
  }
  let best: { workout: Workout; sets: SetEntry[] } | null = null;
  for (const [workoutId, sets] of byWorkout.entries()) {
    const w = await db.workouts.get(workoutId);
    if (!w) continue;
    sets.sort((a, b) => a.setNumber - b.setNumber);
    if (!best || w.startedAt > best.workout.startedAt) best = { workout: w, sets };
  }
  return best;
}

/** Sum of weight × reps across non-warmup sets. */
export function totalVolumeKg(sets: SetEntry[]): number {
  return sets.reduce((acc, s) => acc + (s.isWarmup ? 0 : s.weightKg * s.reps), 0);
}

/** Unique exercise IDs that have at least one set in this workout, in insertion order. */
export function exerciseOrderFromSets(sets: SetEntry[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const s of sets.slice().sort((a, b) => a.completedAt - b.completedAt)) {
    if (!seen.has(s.exerciseId)) {
      seen.add(s.exerciseId);
      ordered.push(s.exerciseId);
    }
  }
  return ordered;
}

/**
 * Returns the most recently trained exercises (distinct by exerciseId) up to
 * `limit`. Used by the exercise picker's "Zuletzt verwendet" quick-access row.
 */
export async function recentExercisesForPicker(limit: number): Promise<Exercise[]> {
  const recentSets = await db.sets.orderBy('completedAt').reverse().limit(limit * 5).toArray();
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const s of recentSets) {
    if (seen.has(s.exerciseId)) continue;
    seen.add(s.exerciseId);
    ids.push(s.exerciseId);
    if (ids.length >= limit) break;
  }
  if (ids.length === 0) return [];
  const rows = await db.exercises.bulkGet(ids);
  return rows.filter((e): e is Exercise => Boolean(e));
}

/** Count of finished workouts whose startedAt falls in the ISO week containing `now`. */
export async function workoutsThisWeekCount(now: number): Promise<number> {
  const weekStart = startOfIsoWeek(now);
  const weekEnd = addWeeks(weekStart, 1);
  const rows = await db.workouts
    .where('startedAt')
    .between(weekStart, weekEnd, true, false)
    .filter((w) => Boolean(w.finishedAt))
    .toArray();
  return rows.length;
}

/** startedAt of the most recent *finished* workout, across the whole app, or null. */
export async function lastWorkoutDate(): Promise<number | null> {
  const rows = await db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((w) => Boolean(w.finishedAt))
    .limit(1)
    .toArray();
  return rows[0]?.startedAt ?? null;
}

export interface SessionPrEntry {
  exerciseId: string;
  exerciseName: string;
  /** Union of every category broken by any set of this exercise in the session. */
  categories: PrCategory[];
}

export interface SessionPrSummary {
  /** One entry per exercise with ≥1 PR-breaking set, first-encountered order. */
  entries: SessionPrEntry[];
  /** Count of individual sets that broke ≥1 category. */
  totalPrSets: number;
  hasAnyPr: boolean;
}

/**
 * Runs once, at "view summary" time, over all of one workout's sets, exercise
 * by exercise — using the exact chronological "prior" rule from
 * ExerciseBlock.tsx's live PR detection (see prBreakingSetsInWorkout).
 */
export async function computeSessionPrSummary(workoutId: string): Promise<SessionPrSummary> {
  const sessionSets = await db.sets.where('workoutId').equals(workoutId).toArray();
  if (sessionSets.length === 0) return { entries: [], totalPrSets: 0, hasAnyPr: false };

  const exerciseIds = exerciseOrderFromSets(sessionSets);
  const entries: SessionPrEntry[] = [];
  let totalPrSets = 0;

  for (const exerciseId of exerciseIds) {
    const history = await db.sets.where('exerciseId').equals(exerciseId).sortBy('completedAt');
    const broken = prBreakingSetsInWorkout(history, workoutId);
    if (broken.size === 0) continue;
    const categories = new Set<PrCategory>();
    for (const cats of broken.values()) {
      totalPrSets++;
      for (const c of cats) categories.add(c);
    }
    const ex = await db.exercises.get(exerciseId);
    entries.push({ exerciseId, exerciseName: ex?.name ?? '?', categories: Array.from(categories) });
  }
  return { entries, totalPrSets, hasAnyPr: entries.length > 0 };
}

export async function getExerciseMap(ids: string[]): Promise<Map<string, Exercise>> {
  if (ids.length === 0) return new Map();
  const rows = await db.exercises.bulkGet(ids);
  const map = new Map<string, Exercise>();
  rows.forEach((e, i) => {
    if (e) map.set(ids[i], e);
  });
  return map;
}
