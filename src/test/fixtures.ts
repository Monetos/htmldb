import { db } from '../db/database';
import type { Exercise, SetEntry, Workout } from '../db/schema';
import { newId } from '../lib/id';

export interface PlannedSet {
  weightKg: number;
  reps: number;
  isWarmup?: boolean;
}

export interface PlannedWorkout {
  daysAgo: number;
  exercises: { exerciseId: string; sets: PlannedSet[] }[];
  bodyweightKg?: number;
}

export async function seedExercise(partial: Partial<Exercise> & { id: string; name: string }): Promise<Exercise> {
  const exercise: Exercise = {
    category: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: 'barbell',
    execution: { setup: '.', movement: '.', cues: ['a', 'b'], commonMistakes: ['c'] },
    defaultRestSeconds: 120,
    isCustom: false,
    createdAt: 0,
    ...partial,
  };
  await db.exercises.put(exercise);
  return exercise;
}

/**
 * Inserts deterministic workouts + sets into the database for testing. All
 * timestamps are computed relative to `nowMs`, so tests can pin a fixed
 * "today" via vi.setSystemTime() or by passing an explicit value.
 */
export async function seedWorkoutHistory(
  planned: PlannedWorkout[],
  nowMs: number,
): Promise<{ workouts: Workout[]; sets: SetEntry[] }> {
  const day = 24 * 60 * 60 * 1000;
  const workouts: Workout[] = [];
  const sets: SetEntry[] = [];

  for (const pw of planned) {
    const startedAt = nowMs - pw.daysAgo * day;
    const workout: Workout = {
      id: newId(),
      date: startedAt,
      startedAt,
      finishedAt: startedAt + 45 * 60 * 1000,
      bodyweightKg: pw.bodyweightKg,
    };
    workouts.push(workout);
    let cursor = startedAt;
    for (const exGroup of pw.exercises) {
      exGroup.sets.forEach((ps, i) => {
        cursor += 60 * 1000;
        sets.push({
          id: newId(),
          workoutId: workout.id,
          exerciseId: exGroup.exerciseId,
          setNumber: i + 1,
          weightKg: ps.weightKg,
          reps: ps.reps,
          isWarmup: ps.isWarmup ?? false,
          completedAt: cursor,
        });
      });
    }
  }
  await db.workouts.bulkAdd(workouts);
  await db.sets.bulkAdd(sets);
  return { workouts, sets };
}
