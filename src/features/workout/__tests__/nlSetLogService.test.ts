import { describe, expect, it } from 'vitest';
import {
  commitNlSetLogGroups,
  commitNlSetShorthand,
  fetchExerciseCandidates,
} from '../nlSetLogService';
import { startFreeWorkout } from '../workoutLib';
import { db } from '../../../db/database';
import type { Exercise } from '../../../db/schema';
import type { NlSetLogGroup } from '../workoutAiLib';

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

describe('fetchExerciseCandidates', () => {
  it('maps every exercise to a lightweight {id, name} candidate', async () => {
    await db.exercises.bulkAdd([benchExercise, squatExercise]);
    const candidates = await fetchExerciseCandidates();
    expect(candidates).toContainEqual({ id: 'ex-bench', name: 'Bankdrücken' });
    expect(candidates).toContainEqual({ id: 'ex-squat', name: 'Kniebeuge' });
  });
});

describe('commitNlSetLogGroups', () => {
  it('commits each resolved group sequentially, producing correct per-exercise setNumbers', async () => {
    await db.exercises.bulkAdd([benchExercise, squatExercise]);
    const w = await startFreeWorkout();

    const groups: NlSetLogGroup[] = [
      {
        exerciseId: 'ex-bench',
        rawExerciseText: 'Bankdrücken',
        sets: [
          { weightKg: 100, reps: 5, isWarmup: false, toFailure: false },
          { weightKg: 100, reps: 5, isWarmup: false, toFailure: false },
          { weightKg: 100, reps: 5, isWarmup: false, toFailure: false },
        ],
      },
      {
        exerciseId: 'ex-squat',
        rawExerciseText: 'Kniebeuge',
        sets: [
          { weightKg: 80, reps: 5, isWarmup: false, toFailure: false },
          { weightKg: 85, reps: 5, isWarmup: false, toFailure: false },
        ],
      },
    ];

    const created = await commitNlSetLogGroups(w.id, groups);
    expect(created).toHaveLength(5);

    const benchSets = created.filter((s) => s.exerciseId === 'ex-bench');
    expect(benchSets.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    expect(benchSets.every((s) => s.weightKg === 100)).toBe(true);

    const squatSets = created.filter((s) => s.exerciseId === 'ex-squat');
    expect(squatSets.map((s) => s.setNumber)).toEqual([1, 2]);
    expect(squatSets.map((s) => s.weightKg)).toEqual([80, 85]);
  });

  it('skips groups with a null exerciseId (unresolved — the review UI must resolve or discard first)', async () => {
    await db.exercises.add(benchExercise);
    const w = await startFreeWorkout();

    const groups: NlSetLogGroup[] = [
      {
        exerciseId: null,
        rawExerciseText: 'Unbekannte Übung',
        sets: [{ weightKg: 50, reps: 8, isWarmup: false, toFailure: false }],
      },
      {
        exerciseId: 'ex-bench',
        rawExerciseText: 'Bankdrücken',
        sets: [{ weightKg: 100, reps: 5, isWarmup: false, toFailure: false }],
      },
    ];

    const created = await commitNlSetLogGroups(w.id, groups);
    expect(created).toHaveLength(1);
    expect(created[0].exerciseId).toBe('ex-bench');
  });
});

describe('commitNlSetShorthand', () => {
  it('commits sets sequentially for a single pre-known exercise', async () => {
    await db.exercises.add(benchExercise);
    const w = await startFreeWorkout();

    const created = await commitNlSetShorthand(w.id, 'ex-bench', [
      { weightKg: 100, reps: 5, isWarmup: false, toFailure: false },
      { weightKg: 100, reps: 5, isWarmup: false, toFailure: false },
    ]);
    expect(created.map((s) => s.setNumber)).toEqual([1, 2]);
  });
});
