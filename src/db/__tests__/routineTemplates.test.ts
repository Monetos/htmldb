import { describe, expect, it } from 'vitest';
import { ROUTINE_TEMPLATES } from '../routineTemplates';
import { SEED_EXERCISES } from '../seedExercises';

const SEED_NAMES = new Set(SEED_EXERCISES.map((e) => e.name));

const EXPECTED_DAY_COUNTS: Record<string, number> = {
  ppl: 3,
  'upper-lower': 2,
  'full-body': 3,
  '531': 4,
  'starting-strength': 2,
};

describe('ROUTINE_TEMPLATES', () => {
  it('has unique ids', () => {
    const ids = ROUTINE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has the expected number of days per template', () => {
    for (const t of ROUTINE_TEMPLATES) {
      expect(t.days.length).toBe(EXPECTED_DAY_COUNTS[t.id]);
    }
  });

  it('references only exercise names that exist in SEED_EXERCISES', () => {
    for (const t of ROUTINE_TEMPLATES) {
      for (const day of t.days) {
        expect(day.exercises.length).toBeGreaterThan(0);
        for (const ex of day.exercises) {
          expect(SEED_NAMES.has(ex.exerciseName)).toBe(true);
        }
      }
    }
  });

  it('has sane rep ranges and set/rest counts for every exercise', () => {
    for (const t of ROUTINE_TEMPLATES) {
      for (const day of t.days) {
        for (const ex of day.exercises) {
          expect(ex.targetSets).toBeGreaterThan(0);
          expect(ex.targetRepsMin).toBeGreaterThan(0);
          expect(ex.targetRepsMax).toBeGreaterThanOrEqual(ex.targetRepsMin);
          expect(ex.targetRestSeconds).toBeGreaterThan(0);
        }
      }
    }
  });
});
