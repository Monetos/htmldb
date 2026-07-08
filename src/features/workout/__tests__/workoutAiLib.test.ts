import { describe, expect, it } from 'vitest';
import { AiError } from '../../../lib/anthropicClient';
import { parseNlSetLogGroups, parseNlSetShorthand, parsePlateauExplanation } from '../workoutAiLib';

const CANDIDATES = new Set(['ex1', 'ex2']);

describe('parseNlSetLogGroups', () => {
  it('resolves an exact-match exerciseId', () => {
    const groups = parseNlSetLogGroups(
      { groups: [{ exerciseId: 'ex1', rawExerciseText: 'Bankdrücken', sets: [{ weightKg: 100, reps: 5 }] }] },
      CANDIDATES,
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].exerciseId).toBe('ex1');
    expect(groups[0].sets).toEqual([{ weightKg: 100, reps: 5, rpe: undefined, isWarmup: false, toFailure: false }]);
  });

  it('maps "no_match" to null while preserving rawExerciseText', () => {
    const groups = parseNlSetLogGroups(
      { groups: [{ exerciseId: 'no_match', rawExerciseText: 'Superübung XYZ', sets: [{ weightKg: 50, reps: 8 }] }] },
      CANDIDATES,
    );
    expect(groups[0].exerciseId).toBeNull();
    expect(groups[0].rawExerciseText).toBe('Superübung XYZ');
  });

  it('defensively coerces an out-of-candidate-set exerciseId to null (simulated schema bypass)', () => {
    const groups = parseNlSetLogGroups(
      { groups: [{ exerciseId: 'ex_does_not_exist', rawExerciseText: 'X', sets: [{ weightKg: 50, reps: 5 }] }] },
      CANDIDATES,
    );
    expect(groups[0].exerciseId).toBeNull();
  });

  it('parses multiple sets with a repeated weight ("dann 5, dann 5" shape)', () => {
    const groups = parseNlSetLogGroups(
      {
        groups: [
          {
            exerciseId: 'ex1',
            rawExerciseText: 'Bankdrücken',
            sets: [
              { weightKg: 100, reps: 5 },
              { weightKg: 100, reps: 5 },
              { weightKg: 100, reps: 5 },
            ],
          },
        ],
      },
      CANDIDATES,
    );
    expect(groups[0].sets).toHaveLength(3);
    expect(groups[0].sets.every((s) => s.weightKg === 100)).toBe(true);
  });

  it('parses multiple sets with per-set weight changes ("80kg 5, 85kg 5, 90kg 3" shape)', () => {
    const groups = parseNlSetLogGroups(
      {
        groups: [
          {
            exerciseId: 'ex1',
            rawExerciseText: 'Kniebeuge',
            sets: [
              { weightKg: 80, reps: 5 },
              { weightKg: 85, reps: 5 },
              { weightKg: 90, reps: 3 },
            ],
          },
        ],
      },
      CANDIDATES,
    );
    expect(groups[0].sets.map((s) => [s.weightKg, s.reps])).toEqual([
      [80, 5],
      [85, 5],
      [90, 3],
    ]);
  });

  it('drops sets with non-positive weight or reps', () => {
    const groups = parseNlSetLogGroups(
      {
        groups: [
          {
            exerciseId: 'ex1',
            rawExerciseText: 'X',
            sets: [
              { weightKg: -5, reps: 5 },
              { weightKg: 100, reps: 0 },
              { weightKg: 100, reps: 5 },
            ],
          },
        ],
      },
      CANDIDATES,
    );
    expect(groups[0].sets).toHaveLength(1);
    expect(groups[0].sets[0]).toMatchObject({ weightKg: 100, reps: 5 });
  });

  it('drops groups that end up with zero valid sets', () => {
    const groups = parseNlSetLogGroups(
      { groups: [{ exerciseId: 'ex1', rawExerciseText: 'X', sets: [{ weightKg: 0, reps: 5 }] }] },
      CANDIDATES,
    );
    expect(groups).toHaveLength(0);
  });

  it('reads optional rpe/isWarmup/toFailure fields, defaulting booleans to false', () => {
    const groups = parseNlSetLogGroups(
      {
        groups: [
          {
            exerciseId: 'ex1',
            rawExerciseText: 'X',
            sets: [{ weightKg: 60, reps: 10, rpe: 8, isWarmup: true, toFailure: true }],
          },
        ],
      },
      CANDIDATES,
    );
    expect(groups[0].sets[0]).toEqual({ weightKg: 60, reps: 10, rpe: 8, isWarmup: true, toFailure: true });
  });

  it('throws AiError for non-object payloads', () => {
    expect(() => parseNlSetLogGroups('nope', CANDIDATES)).toThrow(AiError);
    expect(() => parseNlSetLogGroups(null, CANDIDATES)).toThrow(AiError);
  });

  it('tolerates a missing/malformed groups array', () => {
    expect(parseNlSetLogGroups({}, CANDIDATES)).toEqual([]);
  });
});

describe('parseNlSetShorthand', () => {
  it('parses a valid sets array', () => {
    const sets = parseNlSetShorthand({ sets: [{ weightKg: 100, reps: 5 }, { weightKg: 100, reps: 5 }] });
    expect(sets).toHaveLength(2);
  });

  it('drops invalid entries', () => {
    const sets = parseNlSetShorthand({ sets: [{ weightKg: 100, reps: 5 }, { weightKg: 0, reps: 5 }] });
    expect(sets).toHaveLength(1);
  });

  it('throws AiError for non-object payloads', () => {
    expect(() => parseNlSetShorthand('nope')).toThrow(AiError);
    expect(() => parseNlSetShorthand(undefined)).toThrow(AiError);
  });
});

describe('parsePlateauExplanation', () => {
  it('accepts a valid narrative and trims whitespace', () => {
    const result = parsePlateauExplanation({ narrative: '  Deine Kraftwerte stagnieren seit einigen Wochen.  ' });
    expect(result.narrative).toBe('Deine Kraftwerte stagnieren seit einigen Wochen.');
  });

  it('throws AiError when the narrative is missing or blank', () => {
    expect(() => parsePlateauExplanation({})).toThrow(AiError);
    expect(() => parsePlateauExplanation({ narrative: '   ' })).toThrow(AiError);
  });

  it('throws AiError for non-object payloads', () => {
    expect(() => parsePlateauExplanation('nope')).toThrow(AiError);
    expect(() => parsePlateauExplanation(null)).toThrow(AiError);
  });
});
