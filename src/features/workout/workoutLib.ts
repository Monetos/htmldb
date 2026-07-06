import { db } from '../../db/database';
import type { Exercise, SetEntry, UnilateralSide, Workout } from '../../db/schema';
import { newId } from '../../lib/id';

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

export async function getExerciseMap(ids: string[]): Promise<Map<string, Exercise>> {
  if (ids.length === 0) return new Map();
  const rows = await db.exercises.bulkGet(ids);
  const map = new Map<string, Exercise>();
  rows.forEach((e, i) => {
    if (e) map.set(ids[i], e);
  });
  return map;
}
