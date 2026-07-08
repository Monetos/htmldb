import { describe, expect, it } from 'vitest';
import {
  actionablePlateaus,
  computeAllExercisePlateaus,
  dismissPlateau,
  isPlateauCurrentlyDismissed,
  nutritionStatsForPlateauWindow,
} from '../plateauLib';
import { db, ensureSettings } from '../../../db/database';
import type { Exercise } from '../../../db/schema';
import type { WorkoutStrengthPoint } from '../../../lib/plateauDetection';
import { logFood, saveFood } from '../../nutrition/nutritionLib';

const DAY = 86_400_000;

const benchExercise: Exercise = {
  id: 'ex-bench',
  name: 'Bankdrücken',
  category: 'compound',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  equipment: 'barbell',
  execution: { setup: '.', movement: '.', cues: ['a', 'b'], commonMistakes: ['x'] },
  defaultRestSeconds: 180,
  isCustom: false,
  createdAt: 0,
};

const squatExercise: Exercise = { ...benchExercise, id: 'ex-squat', name: 'Kniebeuge' };

let seedCounter = 0;

async function seedWorkoutWithSet(
  exerciseId: string,
  startedAt: number,
  weightKg: number,
  reps: number,
): Promise<void> {
  seedCounter += 1;
  const workoutId = `w-${seedCounter}`;
  await db.workouts.add({ id: workoutId, date: startedAt, startedAt });
  await db.sets.add({
    id: `s-${seedCounter}`,
    workoutId,
    exerciseId,
    setNumber: 1,
    weightKg,
    reps,
    isWarmup: false,
    completedAt: startedAt,
  });
}

/** 12 workouts, flat e1RM within the ±2.5% band -> 'plateaued'. */
async function seedPlateauedExercise(exerciseId: string, now: number): Promise<void> {
  for (let i = 0; i < 6; i++) {
    await seedWorkoutWithSet(exerciseId, now - (12 - i) * DAY, 100, 5); // baseline
  }
  for (let i = 0; i < 6; i++) {
    await seedWorkoutWithSet(exerciseId, now - (6 - i) * DAY, 101, 5); // current, +~1%
  }
}

describe('computeAllExercisePlateaus', () => {
  it('includes an entry per exercise with logged sets, with the correct status and no false dismissal', async () => {
    await db.exercises.bulkAdd([benchExercise, squatExercise]);
    const now = 100 * DAY;
    await seedPlateauedExercise('ex-bench', now);
    // Squat gets only 5 workouts -> insufficient_data.
    for (let i = 0; i < 5; i++) {
      await seedWorkoutWithSet('ex-squat', now - (5 - i) * DAY, 80, 5);
    }

    const entries = await computeAllExercisePlateaus(now);
    const bench = entries.find((e) => e.exerciseId === 'ex-bench');
    const squat = entries.find((e) => e.exerciseId === 'ex-squat');
    expect(bench?.plateauResult.status).toBe('plateaued');
    expect(bench?.isDismissed).toBe(false);
    expect(squat?.plateauResult.status).toBe('insufficient_data');
  });

  it('omits exercises with no logged sets entirely', async () => {
    await db.exercises.bulkAdd([benchExercise, squatExercise]);
    const now = 100 * DAY;
    await seedPlateauedExercise('ex-bench', now); // squat gets nothing
    const entries = await computeAllExercisePlateaus(now);
    expect(entries.map((e) => e.exerciseId)).toEqual(['ex-bench']);
  });
});

describe('actionablePlateaus', () => {
  it('filters to undismissed plateaued/regressing entries, regressing first', () => {
    const base = {
      currentBestE1rmKg: null,
      baselineBestE1rmKg: null,
      currentWindowWorkouts: 0,
      baselineWindowWorkouts: 0,
      totalWorkoutsConsidered: 0,
    };
    const entries = [
      { exerciseId: 'a', exerciseName: 'A', latestPointStartedAt: 0, isDismissed: false, plateauResult: { ...base, status: 'progressing' as const } },
      { exerciseId: 'b', exerciseName: 'B', latestPointStartedAt: 0, isDismissed: false, plateauResult: { ...base, status: 'plateaued' as const } },
      { exerciseId: 'c', exerciseName: 'C', latestPointStartedAt: 0, isDismissed: false, plateauResult: { ...base, status: 'regressing' as const } },
      { exerciseId: 'd', exerciseName: 'D', latestPointStartedAt: 0, isDismissed: true, plateauResult: { ...base, status: 'regressing' as const } },
      { exerciseId: 'e', exerciseName: 'E', latestPointStartedAt: 0, isDismissed: false, plateauResult: { ...base, status: 'insufficient_data' as const } },
    ];
    const result = actionablePlateaus(entries);
    expect(result.map((e) => e.exerciseId)).toEqual(['c', 'b']);
  });
});

describe('dismissPlateau / isPlateauCurrentlyDismissed', () => {
  it('is dismissed immediately after dismissing, and reflected by computeAllExercisePlateaus', async () => {
    await db.exercises.add(benchExercise);
    const now = 100 * DAY;
    await seedPlateauedExercise('ex-bench', now);

    let entries = await computeAllExercisePlateaus(now);
    const latestPointStartedAt = entries[0].latestPointStartedAt!;
    expect(await isPlateauCurrentlyDismissed('ex-bench', latestPointStartedAt)).toBe(false);

    await dismissPlateau('ex-bench');

    expect(await isPlateauCurrentlyDismissed('ex-bench', latestPointStartedAt)).toBe(true);
    entries = await computeAllExercisePlateaus(now);
    expect(entries[0].isDismissed).toBe(true);
  });

  it('goes stale (re-surfaces) once a workout after the dismissal is logged', async () => {
    await db.exercises.add(benchExercise);
    const now = 100 * DAY;
    await seedPlateauedExercise('ex-bench', now);
    await dismissPlateau('ex-bench');

    const settings = await ensureSettings();
    const dismissedAt = settings.dismissedPlateaus!['ex-bench'].dismissedAt;

    // A workout logged after the real dismissal timestamp invalidates the dismissal.
    await seedWorkoutWithSet('ex-bench', dismissedAt + DAY, 102, 5);
    const laterNow = dismissedAt + 2 * DAY;

    const entries = await computeAllExercisePlateaus(laterNow);
    expect(entries[0].isDismissed).toBe(false);
  });
});

describe('nutritionStatsForPlateauWindow', () => {
  const now = new Date(2026, 5, 1, 18).getTime();

  it('spans from the first point of the current window to now, reusing buildDigestStats', async () => {
    const food = await saveFood({ name: 'PlateauFood', per100g: { kcal: 200, protein: 10, carbs: 20, fat: 5 } });
    await logFood({ foodId: food.id, amountG: 500, mealType: 'lunch', date: now });

    const points: WorkoutStrengthPoint[] = Array.from({ length: 6 }, (_, i) => ({
      workoutId: `w${i}`,
      startedAt: now - (5 - i) * DAY, // oldest of the 6 is 5 days before now
      bestE1rmKg: 100,
      volumeKg: 500,
    }));

    const stats = await nutritionStatsForPlateauWindow(points, now);
    expect(stats.totalDays).toBe(5); // ceil(5 days) -> weeklyTotals(now, 5) returns 5 daily buckets
    expect(stats.targetKcal).toBeGreaterThan(0);
  });

  it('caps the span at 84 days for a long-running current window', async () => {
    const points: WorkoutStrengthPoint[] = Array.from({ length: 6 }, (_, i) => ({
      workoutId: `w${i}`,
      startedAt: now - (200 - i) * DAY, // way more than 84 days ago
      bestE1rmKg: 100,
      volumeKg: 500,
    }));
    const stats = await nutritionStatsForPlateauWindow(points, now);
    expect(stats.totalDays).toBe(84);
  });
});
