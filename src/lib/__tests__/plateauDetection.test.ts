import { describe, expect, it } from 'vitest';
import {
  detectPlateau,
  isPlateauDismissalStale,
  PLATEAU_MIN_POINTS,
  perWorkoutBestE1rm,
  type WorkoutStrengthPoint,
} from '../plateauDetection';
import type { SetEntry, Workout } from '../../db/schema';

const DAY = 86_400_000;

let setIdCounter = 0;

function mkSet(workoutId: string, weightKg: number, reps: number, isWarmup = false): SetEntry {
  setIdCounter += 1;
  return {
    id: `set-${setIdCounter}`,
    workoutId,
    exerciseId: 'ex1',
    setNumber: 1,
    weightKg,
    reps,
    isWarmup,
    completedAt: 0,
  };
}

function mkWorkout(id: string, startedAt: number): Workout {
  return { id, date: startedAt, startedAt };
}

describe('perWorkoutBestE1rm', () => {
  it('picks the true best estimated 1RM, not just the raw top weight', () => {
    // 100kg x1 -> e1RM 103.33; 90kg x8 -> e1RM 114.0 (the true best despite lower raw weight).
    const sets = [mkSet('w1', 100, 1), mkSet('w1', 90, 8)];
    const workouts = new Map([['w1', mkWorkout('w1', 1000)]]);
    const points = perWorkoutBestE1rm(sets, workouts);
    expect(points).toHaveLength(1);
    expect(points[0].bestE1rmKg).toBeCloseTo(90 * (1 + 8 / 30), 5);
    expect(points[0].bestE1rmKg).toBeGreaterThan(100 * (1 + 1 / 30));
  });

  it('excludes warmup sets and groups by workout, oldest first', () => {
    const sets = [
      mkSet('w2', 999, 1, true), // warmup, excluded
      mkSet('w2', 100, 5),
      mkSet('w1', 80, 5),
    ];
    const workouts = new Map([
      ['w1', mkWorkout('w1', 1000)],
      ['w2', mkWorkout('w2', 2000)],
    ]);
    const points = perWorkoutBestE1rm(sets, workouts);
    expect(points.map((p) => p.workoutId)).toEqual(['w1', 'w2']);
    expect(points[1].bestE1rmKg).toBeCloseTo(100 * (1 + 5 / 30), 5);
  });

  it('drops sets with non-positive weight or reps', () => {
    const sets = [mkSet('w1', 0, 5), mkSet('w1', 100, 0), mkSet('w1', 100, 5)];
    const workouts = new Map([['w1', mkWorkout('w1', 1000)]]);
    const points = perWorkoutBestE1rm(sets, workouts);
    expect(points[0].bestE1rmKg).toBeCloseTo(100 * (1 + 5 / 30), 5);
  });
});

function points(values: number[], startAt = 0): WorkoutStrengthPoint[] {
  return values.map((v, i) => ({
    workoutId: `w${i}`,
    startedAt: startAt + i * DAY,
    bestE1rmKg: v,
    volumeKg: 0,
  }));
}

describe('detectPlateau', () => {
  it('returns insufficient_data with fewer than 12 points', () => {
    const result = detectPlateau(points(new Array(11).fill(100)));
    expect(result.status).toBe('insufficient_data');
    expect(result.currentBestE1rmKg).toBeNull();
    expect(result.totalWorkoutsConsidered).toBe(11);
  });

  it('flags progressing when the current window clearly exceeds the baseline max', () => {
    const baseline = [100, 100, 100, 100, 100, 105];
    const current = [108, 108, 108, 108, 108, 108];
    const result = detectPlateau(points([...baseline, ...current]));
    expect(result.status).toBe('progressing');
    expect(result.baselineBestE1rmKg).toBe(105);
    expect(result.currentBestE1rmKg).toBe(108);
  });

  it('flags regressing when the current window clearly falls below the baseline max', () => {
    const baseline = [100, 100, 100, 100, 100, 110];
    const current = [105, 105, 105, 105, 105, 105];
    const result = detectPlateau(points([...baseline, ...current]));
    expect(result.status).toBe('regressing');
  });

  it('flags plateaued when within the ±2.5% margin', () => {
    const baseline = new Array(6).fill(110);
    const current = new Array(6).fill(111); // +0.9%, inside the band
    const result = detectPlateau(points([...baseline, ...current]));
    expect(result.status).toBe('plateaued');
  });

  it('treats a value just inside the margin as plateaued, not progressing', () => {
    const baseline = new Array(6).fill(100);
    const current = new Array(6).fill(102.4); // +2.4%, just inside the ±2.5% band
    const result = detectPlateau(points([...baseline, ...current]));
    expect(result.status).toBe('plateaued');
  });

  it('is not dragged down by a single bad session in an otherwise-strong current window (max, not mean)', () => {
    const baseline = new Array(6).fill(100);
    const current = [108, 108, 108, 108, 108, 50]; // one deload/bad-sleep session
    const result = detectPlateau(points([...baseline, ...current]));
    expect(result.status).toBe('progressing');
    expect(result.currentBestE1rmKg).toBe(108);
  });

  it('is not inflated by a single anomalous heavy single in the baseline window (max, not mean)', () => {
    const baseline = [100, 100, 100, 100, 100, 200]; // one outlier PR attempt in the baseline
    const current = new Array(6).fill(101); // essentially flat vs the outlier-dominated baseline max
    const result = detectPlateau(points([...baseline, ...current]));
    expect(result.baselineBestE1rmKg).toBe(200);
    expect(result.status).toBe('regressing');
  });

  it('uses only the 6 workouts immediately before the current window as baseline, ignoring older history', () => {
    const olderHistory = new Array(3).fill(9999); // should be ignored entirely
    const baseline = new Array(6).fill(100);
    const current = new Array(6).fill(101);
    const result = detectPlateau(points([...olderHistory, ...baseline, ...current]));
    expect(result.baselineBestE1rmKg).toBe(100);
    expect(result.totalWorkoutsConsidered).toBe(15);
    expect(result.status).toBe('plateaued');
  });

  it('PLATEAU_MIN_POINTS equals current + baseline window sizes', () => {
    expect(PLATEAU_MIN_POINTS).toBe(12);
  });
});

describe('isPlateauDismissalStale', () => {
  it('is false when no newer workout exists for the exercise', () => {
    expect(isPlateauDismissalStale(1000, 500)).toBe(false);
    expect(isPlateauDismissalStale(1000, 1000)).toBe(false);
  });

  it('is true once a workout after the dismissal exists', () => {
    expect(isPlateauDismissalStale(1000, 1001)).toBe(true);
  });
});
