import { describe, expect, it } from 'vitest';
import { formatDuration, formatWeight, formatWorkoutLength, volumeKg } from '../format';

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [9, '0:09'],
    [60, '1:00'],
    [125, '2:05'],
    [-5, '0:00'],
  ])('formats %s seconds as %s', (s, expected) => {
    expect(formatDuration(s)).toBe(expected);
  });
});

describe('formatWorkoutLength', () => {
  it('returns en-dash when the workout has no finishedAt', () => {
    expect(formatWorkoutLength(0)).toBe('–');
  });
  it('formats short workouts in minutes', () => {
    expect(formatWorkoutLength(0, 25 * 60_000)).toBe('25 min');
  });
  it('formats long workouts in hours + minutes', () => {
    expect(formatWorkoutLength(0, (75) * 60_000)).toBe('1h 15min');
  });
});

describe('formatWeight', () => {
  it('keeps integers compact', () => {
    expect(formatWeight(60)).toBe('60');
  });
  it('shows one decimal for fractional weights', () => {
    expect(formatWeight(60.5)).toBe('60.5');
  });
});

describe('volumeKg', () => {
  it('returns weight × reps for working sets', () => {
    expect(volumeKg(80, 8, false)).toBe(640);
  });
  it('returns 0 for warmup sets', () => {
    expect(volumeKg(80, 8, true)).toBe(0);
  });
});
