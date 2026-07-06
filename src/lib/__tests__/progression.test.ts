import { describe, expect, it } from 'vitest';
import {
  addWeeks,
  bestPrFromSets,
  estimatedOneRm,
  filterByTimeRange,
  isoDayKey,
  muscleAmpelFromWeeks,
  newPrCategories,
  perWorkoutExerciseStats,
  prBreakingSetsInWorkout,
  startOfIsoWeek,
  streakDays,
  volumePerMuscleGroup,
  weeklyMuscleVolume,
  workingSetsPerMuscleGroup,
} from '../progression';
import type { Exercise, SetEntry, Workout } from '../../db/schema';

const bench: Exercise = {
  id: 'bench',
  name: 'Bench',
  category: 'compound',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps', 'shoulders_front'],
  equipment: 'barbell',
  execution: { setup: '.', movement: '.', cues: ['a', 'b'], commonMistakes: ['x'] },
  defaultRestSeconds: 180,
  isCustom: false,
  createdAt: 0,
};

const row: Exercise = { ...bench, id: 'row', name: 'Row', primaryMuscles: ['back_lats'], secondaryMuscles: ['biceps'] };

const exMap = new Map<string, Exercise>([
  ['bench', bench],
  ['row', row],
]);

function s(partial: Partial<SetEntry>): SetEntry {
  return {
    id: 'id',
    workoutId: 'w',
    exerciseId: 'bench',
    setNumber: 1,
    weightKg: 60,
    reps: 8,
    isWarmup: false,
    completedAt: 0,
    ...partial,
  };
}

describe('estimatedOneRm (Epley)', () => {
  it.each([
    [100, 1, 100 * (1 + 1 / 30)],
    [80, 5, 80 * (1 + 5 / 30)],
    [60, 10, 60 * (1 + 10 / 30)],
  ])('weight %s × %s reps → %s', (w, r, expected) => {
    expect(estimatedOneRm(w, r)).toBeCloseTo(expected, 5);
  });

  it('returns 0 for non-positive inputs', () => {
    expect(estimatedOneRm(0, 5)).toBe(0);
    expect(estimatedOneRm(60, 0)).toBe(0);
    expect(estimatedOneRm(60, -1)).toBe(0);
  });
});

describe('bestPrFromSets', () => {
  it('returns nulls for an empty list', () => {
    expect(bestPrFromSets([])).toEqual({ heaviestKg: null, heaviestFor5Kg: null, best1Rm: null });
  });

  it('ignores warmup sets', () => {
    const result = bestPrFromSets([
      s({ weightKg: 80, reps: 8 }),
      s({ weightKg: 120, reps: 5, isWarmup: true }),
    ]);
    expect(result.heaviestKg).toBe(80);
  });

  it('ignores drop-sets', () => {
    const result = bestPrFromSets([
      s({ weightKg: 80, reps: 8 }),
      s({ weightKg: 120, reps: 5, isDropSet: true }),
    ]);
    expect(result.heaviestKg).toBe(80);
  });

  it('reports heaviest for 5 reps only when reps >= 5', () => {
    const result = bestPrFromSets([
      s({ weightKg: 100, reps: 3 }),
      s({ weightKg: 80, reps: 5 }),
      s({ weightKg: 90, reps: 6 }),
    ]);
    expect(result.heaviestKg).toBe(100);
    expect(result.heaviestFor5Kg).toBe(90);
  });

  it('picks the highest Epley 1RM across sets', () => {
    const result = bestPrFromSets([
      s({ weightKg: 100, reps: 3 }), // ~110
      s({ weightKg: 80, reps: 8 }), // ~101.3
      s({ weightKg: 60, reps: 12 }), // 84
    ]);
    expect(result.best1Rm).toBeCloseTo(100 * (1 + 3 / 30), 5);
  });
});

describe('newPrCategories', () => {
  it('returns all three when there is no prior record', () => {
    const cats = newPrCategories(
      { heaviestKg: null, heaviestFor5Kg: null, best1Rm: null },
      s({ weightKg: 80, reps: 5 }),
    );
    expect(cats.sort()).toEqual(['best1Rm', 'heaviest', 'heaviestFor5'].sort());
  });

  it('flags only heaviest when reps < 5 and 1RM not exceeded', () => {
    const cats = newPrCategories(
      { heaviestKg: 80, heaviestFor5Kg: 80, best1Rm: 100 },
      s({ weightKg: 90, reps: 3 }), // Epley = 90 * 1.1 = 99 < 100 → no 1RM
    );
    expect(cats).toEqual(['heaviest']);
  });

  it('returns empty for warmup sets', () => {
    const cats = newPrCategories(
      { heaviestKg: null, heaviestFor5Kg: null, best1Rm: null },
      s({ weightKg: 200, reps: 5, isWarmup: true }),
    );
    expect(cats).toEqual([]);
  });

  it('returns empty for drop-sets, even at a new heaviest weight', () => {
    const cats = newPrCategories(
      { heaviestKg: 80, heaviestFor5Kg: 80, best1Rm: 100 },
      s({ weightKg: 200, reps: 5, isDropSet: true }),
    );
    expect(cats).toEqual([]);
  });
});

describe('prBreakingSetsInWorkout', () => {
  it('returns an empty map for an empty history', () => {
    expect(prBreakingSetsInWorkout([], 'w1').size).toBe(0);
  });

  it('flags a set that PRs against an earlier set from the SAME session', () => {
    const history = [
      s({ id: 's1', workoutId: 'w1', weightKg: 60, reps: 8, completedAt: 100 }),
      s({ id: 's2', workoutId: 'w1', weightKg: 70, reps: 8, completedAt: 200 }),
    ];
    const broken = prBreakingSetsInWorkout(history, 'w1');
    expect(broken.get('s1')?.sort()).toEqual(['best1Rm', 'heaviest', 'heaviestFor5'].sort());
    expect(broken.get('s2')?.sort()).toEqual(['best1Rm', 'heaviest', 'heaviestFor5'].sort());
  });

  it('flags a set that PRs against a set from an EARLIER workout', () => {
    const history = [
      s({ id: 's1', workoutId: 'w0', weightKg: 60, reps: 8, completedAt: 100 }),
      s({ id: 's2', workoutId: 'w1', weightKg: 70, reps: 8, completedAt: 200 }),
    ];
    const broken = prBreakingSetsInWorkout(history, 'w1');
    expect(broken.has('s1')).toBe(false);
    expect(broken.get('s2')?.sort()).toEqual(['best1Rm', 'heaviest', 'heaviestFor5'].sort());
  });

  it('does not flag a set in the target workout that fails to beat prior history', () => {
    const history = [
      s({ id: 's1', workoutId: 'w0', weightKg: 100, reps: 8, completedAt: 100 }),
      s({ id: 's2', workoutId: 'w1', weightKg: 60, reps: 8, completedAt: 200 }),
    ];
    const broken = prBreakingSetsInWorkout(history, 'w1');
    expect(broken.has('s2')).toBe(false);
  });

  it('excludes warmup and drop-sets from both detection and the running baseline', () => {
    const history = [
      s({ id: 's1', workoutId: 'w0', weightKg: 100, reps: 8, isWarmup: true, completedAt: 100 }),
      s({ id: 's2', workoutId: 'w0', weightKg: 90, reps: 8, isDropSet: true, completedAt: 150 }),
      s({ id: 's3', workoutId: 'w1', weightKg: 60, reps: 8, completedAt: 200 }),
    ];
    const broken = prBreakingSetsInWorkout(history, 'w1');
    // s1/s2 are ignored entirely, so s3 (60kg) still counts as a fresh PR.
    expect(broken.get('s3')?.sort()).toEqual(['best1Rm', 'heaviest', 'heaviestFor5'].sort());
  });

  it('never flags sets outside the target workout, even if they break PRs', () => {
    const history = [
      s({ id: 's1', workoutId: 'w0', weightKg: 60, reps: 8, completedAt: 100 }),
      s({ id: 's2', workoutId: 'w2', weightKg: 90, reps: 8, completedAt: 200 }),
    ];
    const broken = prBreakingSetsInWorkout(history, 'w1');
    expect(broken.size).toBe(0);
  });
});

describe('volumePerMuscleGroup', () => {
  it('credits primary muscles with full volume and secondary with half', () => {
    const result = volumePerMuscleGroup([s({ weightKg: 100, reps: 5 })], exMap);
    expect(result.chest).toBe(500);
    expect(result.triceps).toBe(250);
    expect(result.shoulders_front).toBe(250);
  });

  it('ignores warmup sets by default but can opt-in', () => {
    const sets = [s({ weightKg: 50, reps: 10, isWarmup: true })];
    expect(volumePerMuscleGroup(sets, exMap).chest).toBeUndefined();
    expect(volumePerMuscleGroup(sets, exMap, { includeWarmup: true }).chest).toBe(500);
  });

  it('skips sets whose exercise is missing from the map', () => {
    const result = volumePerMuscleGroup([s({ exerciseId: 'unknown' })], exMap);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('still counts drop-sets toward volume (unlike PR detection)', () => {
    const result = volumePerMuscleGroup([s({ weightKg: 50, reps: 10, isDropSet: true })], exMap);
    expect(result.chest).toBe(500);
  });
});

describe('workingSetsPerMuscleGroup', () => {
  it('counts one per non-warmup set per primary muscle, secondary excluded', () => {
    const sets = [
      s({ exerciseId: 'bench' }),
      s({ exerciseId: 'bench' }),
      s({ exerciseId: 'row' }),
      s({ exerciseId: 'bench', isWarmup: true }),
    ];
    const result = workingSetsPerMuscleGroup(sets, exMap);
    expect(result.chest).toBe(2);
    expect(result.back_lats).toBe(1);
    expect(result.triceps).toBeUndefined(); // triceps is secondary on bench
  });

  it('still counts drop-sets (unlike PR detection)', () => {
    const sets = [s({ exerciseId: 'bench' }), s({ exerciseId: 'bench', isDropSet: true })];
    expect(workingSetsPerMuscleGroup(sets, exMap).chest).toBe(2);
  });
});

describe('startOfIsoWeek / isoDayKey / addWeeks', () => {
  it('startOfIsoWeek snaps to Monday 00:00', () => {
    // 2026-05-11 is a Monday.
    const monday = new Date(2026, 4, 11, 15, 30).getTime();
    const sunday = new Date(2026, 4, 17, 23, 59).getTime();
    expect(startOfIsoWeek(monday)).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).getTime());
    expect(startOfIsoWeek(sunday)).toBe(new Date(2026, 4, 11, 0, 0, 0, 0).getTime());
  });

  it('addWeeks advances by 7-day jumps', () => {
    const start = startOfIsoWeek(new Date(2026, 4, 11).getTime());
    expect(addWeeks(start, 1)).toBe(new Date(2026, 4, 18, 0, 0, 0, 0).getTime());
    expect(addWeeks(start, -2)).toBe(new Date(2026, 3, 27, 0, 0, 0, 0).getTime());
  });

  it('isoDayKey returns YYYY-MM-DD in local time', () => {
    expect(isoDayKey(new Date(2026, 4, 11, 14).getTime())).toBe('2026-05-11');
    expect(isoDayKey(new Date(2026, 0, 1).getTime())).toBe('2026-01-01');
  });
});

describe('weeklyMuscleVolume', () => {
  it('produces `weeks` consecutive buckets ending in the current week', () => {
    const now = new Date(2026, 4, 13, 18).getTime(); // Wed
    const monday = startOfIsoWeek(now);
    const lastMonday = addWeeks(monday, -1);
    const sets = [
      s({ completedAt: lastMonday + 1, weightKg: 50, reps: 10 }),
      s({ completedAt: monday + 1, weightKg: 60, reps: 8 }),
      s({ completedAt: monday + 2, weightKg: 80, reps: 5 }),
    ];
    const buckets = weeklyMuscleVolume(sets, exMap, now, 2);
    expect(buckets).toHaveLength(2);
    expect(buckets[0].weekStart).toBe(lastMonday);
    expect(buckets[1].weekStart).toBe(monday);
    expect(buckets[0].volume.chest).toBe(500);
    expect(buckets[1].volume.chest).toBe(60 * 8 + 80 * 5);
  });
});

describe('muscleAmpelFromWeeks', () => {
  it('flags below/in-range/above against the 4-week mean of prior weeks', () => {
    const now = new Date(2026, 4, 13).getTime();
    const monday = startOfIsoWeek(now);
    const setsFor = (weeksAgo: number, weightKg: number) =>
      s({ completedAt: addWeeks(monday, -weeksAgo) + 1, weightKg, reps: 10 });
    // Build 6 weeks: 5 prior weeks with chest volume of 1000 each, current week varies.
    const buildSets = (currentChest: number): SetEntry[] => [
      setsFor(5, 100), // outside the 4-week baseline window
      setsFor(4, 100),
      setsFor(3, 100),
      setsFor(2, 100),
      setsFor(1, 100),
      s({ completedAt: monday + 1, weightKg: currentChest, reps: 10 }),
    ];
    const make = (currentChest: number) =>
      muscleAmpelFromWeeks(weeklyMuscleVolume(buildSets(currentChest), exMap, now, 6), ['chest']);

    // Baseline mean = 1000 (4 prior weeks at 100×10 each).
    expect(make(50)[0].status).toBe('below'); // 500 < 800
    expect(make(100)[0].status).toBe('in_range'); // 1000 in [800, 1200]
    expect(make(140)[0].status).toBe('above'); // 1400 > 1200
  });

  it('reports no_baseline when there is neither prior nor current volume', () => {
    const now = Date.now();
    const empty = weeklyMuscleVolume([], exMap, now, 5);
    expect(muscleAmpelFromWeeks(empty, ['chest'])[0].status).toBe('no_baseline');
  });
});

describe('streakDays', () => {
  it('returns 0 with no finished workouts', () => {
    expect(streakDays([], Date.now())).toBe(0);
  });

  it('counts consecutive training days backwards from today', () => {
    const now = new Date(2026, 4, 13, 18).getTime();
    const w = (daysAgo: number): Workout => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      return {
        id: `w-${daysAgo}`,
        date: d.getTime(),
        startedAt: d.getTime(),
        finishedAt: d.getTime() + 1,
      };
    };
    // Trained today, yesterday and the day before. Then a gap, then 2 more.
    expect(streakDays([w(0), w(1), w(2), w(4), w(5)], now)).toBe(3);
  });

  it('rolls back one day when today has not been trained yet', () => {
    const now = new Date(2026, 4, 13, 7).getTime();
    const w = (daysAgo: number): Workout => {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      return {
        id: `w-${daysAgo}`,
        date: d.getTime(),
        startedAt: d.getTime(),
        finishedAt: d.getTime() + 1,
      };
    };
    // Trained yesterday + day before yesterday, not today → streak = 2.
    expect(streakDays([w(1), w(2)], now)).toBe(2);
  });

  it('ignores workouts that were started but never finished', () => {
    const now = Date.now();
    expect(streakDays([{ id: 'x', date: now, startedAt: now }], now)).toBe(0);
  });
});

describe('perWorkoutExerciseStats', () => {
  it('groups by workout, picks heaviest weight + sums volume, ignores warmups', () => {
    const workouts = new Map<string, Workout>([
      ['w1', { id: 'w1', date: 100, startedAt: 100 }],
      ['w2', { id: 'w2', date: 200, startedAt: 200 }],
    ]);
    const sets: SetEntry[] = [
      s({ workoutId: 'w2', weightKg: 80, reps: 5 }),
      s({ workoutId: 'w2', weightKg: 90, reps: 3 }),
      s({ workoutId: 'w1', weightKg: 60, reps: 8 }),
      s({ workoutId: 'w1', weightKg: 100, reps: 10, isWarmup: true }), // ignored
    ];
    const pts = perWorkoutExerciseStats(sets, workouts);
    expect(pts.map((p) => p.workoutId)).toEqual(['w1', 'w2']); // ordered by startedAt
    expect(pts[0].topWeightKg).toBe(60);
    expect(pts[0].volumeKg).toBe(60 * 8);
    expect(pts[1].topWeightKg).toBe(90);
    expect(pts[1].volumeKg).toBe(80 * 5 + 90 * 3);
  });
});

describe('filterByTimeRange', () => {
  it('keeps everything for "all"', () => {
    const now = Date.now();
    const points = [{ startedAt: 0 }, { startedAt: now }];
    expect(filterByTimeRange(points, 'all', now)).toEqual(points);
  });

  it('drops points older than the range cutoff', () => {
    const now = Date.now();
    const longAgo = now - 200 * 24 * 60 * 60 * 1000;
    const points = [{ startedAt: longAgo }, { startedAt: now }];
    expect(filterByTimeRange(points, '3m', now)).toEqual([{ startedAt: now }]);
  });
});
