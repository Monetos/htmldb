import { describe, expect, it } from 'vitest';
import {
  addSet,
  exerciseOrderFromSets,
  finishWorkout,
  getActiveWorkout,
  lastSetForExercise,
  lastWorkoutSetsForExercise,
  startFreeWorkout,
  totalVolumeKg,
} from '../workoutLib';
import { db } from '../../../db/database';
import type { Exercise } from '../../../db/schema';

const benchExercise: Exercise = {
  id: 'ex-bench',
  name: 'Bench',
  category: 'compound',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  equipment: 'barbell',
  execution: { setup: '.', movement: '.', cues: ['a', 'b'], commonMistakes: ['x'] },
  defaultRestSeconds: 180,
  isCustom: false,
  createdAt: 0,
};

const rowExercise: Exercise = { ...benchExercise, id: 'ex-row', name: 'Row' };

describe('startFreeWorkout / getActiveWorkout', () => {
  it('creates a new workout when none is active and returns the same one on a second call', async () => {
    expect(await getActiveWorkout()).toBeNull();
    const w1 = await startFreeWorkout();
    expect(w1.startedAt).toBeGreaterThan(0);
    expect(w1.finishedAt).toBeUndefined();
    const w2 = await startFreeWorkout();
    expect(w2.id).toBe(w1.id);
    const active = await getActiveWorkout();
    expect(active?.id).toBe(w1.id);
  });

  it('finishWorkout marks the workout finished so getActiveWorkout returns undefined', async () => {
    const w = await startFreeWorkout();
    await finishWorkout(w.id, { notes: 'gut', bodyweightKg: 80 });
    const refreshed = await db.workouts.get(w.id);
    expect(refreshed?.finishedAt).toBeDefined();
    expect(refreshed?.notes).toBe('gut');
    expect(refreshed?.bodyweightKg).toBe(80);
    expect(await getActiveWorkout()).toBeNull();
  });
});

describe('addSet', () => {
  it('numbers sets sequentially per (workout, exercise)', async () => {
    await db.exercises.bulkAdd([benchExercise, rowExercise]);
    const w = await startFreeWorkout();

    const s1 = await addSet({
      workoutId: w.id,
      exerciseId: benchExercise.id,
      weightKg: 60,
      reps: 8,
      isWarmup: false,
    });
    const s2 = await addSet({
      workoutId: w.id,
      exerciseId: benchExercise.id,
      weightKg: 60,
      reps: 8,
      isWarmup: false,
    });
    const rowSet = await addSet({
      workoutId: w.id,
      exerciseId: rowExercise.id,
      weightKg: 70,
      reps: 6,
      isWarmup: false,
    });
    expect(s1.setNumber).toBe(1);
    expect(s2.setNumber).toBe(2);
    // Row gets its own counter
    expect(rowSet.setNumber).toBe(1);
  });

  it('persists drop-set/failure/unilateral tags, defaulting to false/undefined when omitted', async () => {
    await db.exercises.add(benchExercise);
    const w = await startFreeWorkout();

    const tagged = await addSet({
      workoutId: w.id,
      exerciseId: benchExercise.id,
      weightKg: 40,
      reps: 12,
      isWarmup: false,
      isDropSet: true,
      toFailure: true,
      unilateralSide: 'left',
    });
    expect(tagged.isDropSet).toBe(true);
    expect(tagged.toFailure).toBe(true);
    expect(tagged.unilateralSide).toBe('left');

    const untagged = await addSet({
      workoutId: w.id,
      exerciseId: benchExercise.id,
      weightKg: 60,
      reps: 8,
      isWarmup: false,
    });
    expect(untagged.isDropSet).toBe(false);
    expect(untagged.toFailure).toBe(false);
    expect(untagged.unilateralSide).toBeUndefined();
  });
});

describe('lastSetForExercise / lastWorkoutSetsForExercise', () => {
  it('returns the most recent set from any prior workout', async () => {
    await db.exercises.add(benchExercise);
    // Workout A
    const a = await startFreeWorkout();
    await addSet({
      workoutId: a.id,
      exerciseId: benchExercise.id,
      weightKg: 60,
      reps: 8,
      isWarmup: false,
    });
    await finishWorkout(a.id, {});
    // Wait one ms so completedAt differs for ordering
    await new Promise((r) => setTimeout(r, 5));
    // Workout B (still active)
    const b = await startFreeWorkout();
    const last = await lastSetForExercise(benchExercise.id, b.id);
    expect(last?.workoutId).toBe(a.id);
    expect(last?.weightKg).toBe(60);
  });

  it('returns the full set list from the latest prior workout', async () => {
    await db.exercises.add(benchExercise);
    const a = await startFreeWorkout();
    await addSet({
      workoutId: a.id,
      exerciseId: benchExercise.id,
      weightKg: 50,
      reps: 10,
      isWarmup: false,
    });
    await addSet({
      workoutId: a.id,
      exerciseId: benchExercise.id,
      weightKg: 55,
      reps: 8,
      isWarmup: false,
    });
    await finishWorkout(a.id, {});
    await new Promise((r) => setTimeout(r, 5));
    const b = await startFreeWorkout();
    const result = await lastWorkoutSetsForExercise(benchExercise.id, b.id);
    expect(result).toBeTruthy();
    expect(result!.workout.id).toBe(a.id);
    expect(result!.sets.map((s) => s.weightKg)).toEqual([50, 55]);
  });
});

describe('totalVolumeKg', () => {
  it('sums weight × reps, ignoring warmup sets', () => {
    expect(
      totalVolumeKg([
        { isWarmup: false, weightKg: 60, reps: 10 } as never,
        { isWarmup: true, weightKg: 20, reps: 10 } as never,
        { isWarmup: false, weightKg: 80, reps: 5 } as never,
      ]),
    ).toBe(60 * 10 + 80 * 5);
  });
});

describe('exerciseOrderFromSets', () => {
  it('returns unique exercise ids ordered by first set time', () => {
    const sets = [
      { exerciseId: 'B', completedAt: 200 } as never,
      { exerciseId: 'A', completedAt: 100 } as never,
      { exerciseId: 'B', completedAt: 300 } as never,
      { exerciseId: 'C', completedAt: 150 } as never,
    ];
    expect(exerciseOrderFromSets(sets)).toEqual(['A', 'C', 'B']);
  });
});
