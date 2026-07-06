import { describe, expect, it } from 'vitest';
import { toggleFavorite } from '../exercisesLib';
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

describe('toggleFavorite', () => {
  it('flips isFavorite from undefined to true, then back to false', async () => {
    await db.exercises.add(benchExercise);

    await toggleFavorite(benchExercise.id, false);
    expect((await db.exercises.get(benchExercise.id))?.isFavorite).toBe(true);

    await toggleFavorite(benchExercise.id, true);
    expect((await db.exercises.get(benchExercise.id))?.isFavorite).toBe(false);
  });
});
