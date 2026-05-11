import { describe, expect, it } from 'vitest';
import { EQUIPMENT_LABELS, MUSCLE_GROUP_LABELS, type Equipment, type MuscleGroup } from '../schema';

const ALL_MUSCLES: MuscleGroup[] = [
  'chest',
  'back_lats',
  'back_traps',
  'back_rhomboids',
  'shoulders_front',
  'shoulders_side',
  'shoulders_rear',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'lower_back',
];

const ALL_EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'];

describe('label maps', () => {
  it('has a German label for every muscle group', () => {
    for (const m of ALL_MUSCLES) {
      expect(MUSCLE_GROUP_LABELS[m]).toBeTruthy();
    }
    expect(Object.keys(MUSCLE_GROUP_LABELS).sort()).toEqual([...ALL_MUSCLES].sort());
  });

  it('has a German label for every equipment type', () => {
    for (const e of ALL_EQUIPMENT) {
      expect(EQUIPMENT_LABELS[e]).toBeTruthy();
    }
    expect(Object.keys(EQUIPMENT_LABELS).sort()).toEqual([...ALL_EQUIPMENT].sort());
  });
});
