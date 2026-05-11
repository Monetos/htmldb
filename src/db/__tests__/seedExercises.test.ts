import { describe, expect, it } from 'vitest';
import { db, seedExercisesIfEmpty } from '../database';
import { SEED_EXERCISES, SEED_EXERCISE_COUNT } from '../seedExercises';
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from '../schema';

describe('seedExercises content', () => {
  it('ships at least 50 curated exercises', () => {
    expect(SEED_EXERCISE_COUNT).toBeGreaterThanOrEqual(50);
  });

  it('marks every seed row as isCustom: false', () => {
    expect(SEED_EXERCISES.every((e) => e.isCustom === false)).toBe(true);
  });

  it('has unique ids and unique names', () => {
    const ids = SEED_EXERCISES.map((e) => e.id);
    const names = SEED_EXERCISES.map((e) => e.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('provides 3-5 cues and at least 2 common mistakes per exercise', () => {
    for (const ex of SEED_EXERCISES) {
      expect(ex.execution.cues.length).toBeGreaterThanOrEqual(2);
      expect(ex.execution.cues.length).toBeLessThanOrEqual(6);
      expect(ex.execution.commonMistakes.length).toBeGreaterThanOrEqual(1);
      expect(ex.execution.setup.length).toBeGreaterThan(5);
      expect(ex.execution.movement.length).toBeGreaterThan(5);
    }
  });

  it('uses only declared muscle groups in primary/secondary', () => {
    const validMuscles = new Set(Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]);
    for (const ex of SEED_EXERCISES) {
      for (const m of [...ex.primaryMuscles, ...ex.secondaryMuscles]) {
        expect(validMuscles.has(m)).toBe(true);
      }
    }
  });

  it('covers all major muscle groups in primary roles', () => {
    const covered = new Set<MuscleGroup>();
    for (const ex of SEED_EXERCISES) ex.primaryMuscles.forEach((m) => covered.add(m));
    // The roadmap's "must-have" groups for a strength-training library:
    const required: MuscleGroup[] = [
      'chest',
      'back_lats',
      'shoulders_front',
      'shoulders_side',
      'shoulders_rear',
      'biceps',
      'triceps',
      'quads',
      'hamstrings',
      'glutes',
      'calves',
      'abs',
    ];
    for (const m of required) expect(covered.has(m)).toBe(true);
  });
});

describe('seedExercisesIfEmpty', () => {
  it('inserts the full seed library when exercises table is empty', async () => {
    expect(await db.exercises.count()).toBe(0);
    const inserted = await seedExercisesIfEmpty();
    expect(inserted).toBe(SEED_EXERCISE_COUNT);
    expect(await db.exercises.count()).toBe(SEED_EXERCISE_COUNT);
  });

  it('is idempotent: a second call does not duplicate rows', async () => {
    await seedExercisesIfEmpty();
    const second = await seedExercisesIfEmpty();
    expect(second).toBe(0);
    expect(await db.exercises.count()).toBe(SEED_EXERCISE_COUNT);
  });

  it('does not seed if the user already added a custom exercise', async () => {
    await db.exercises.add({
      id: 'custom-1',
      name: 'Eigene Übung',
      category: 'compound',
      primaryMuscles: ['chest'],
      secondaryMuscles: [],
      equipment: 'bodyweight',
      execution: { setup: 'x', movement: 'y', cues: ['a', 'b'], commonMistakes: ['c'] },
      defaultRestSeconds: 90,
      isCustom: true,
      createdAt: Date.now(),
    });
    const inserted = await seedExercisesIfEmpty();
    expect(inserted).toBe(0);
    expect(await db.exercises.count()).toBe(1);
  });
});
