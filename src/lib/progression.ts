import type { Exercise, MuscleGroup, SetEntry, Workout } from '../db/schema';

/** Epley 1RM estimate: 1RM ≈ weight × (1 + reps / 30). Reps <= 0 → 0. */
export function estimatedOneRm(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  return weightKg * (1 + reps / 30);
}

export interface PrBest {
  /** Heaviest weight lifted for ≥1 rep (warmup sets excluded). */
  heaviestKg: number | null;
  /** Heaviest weight lifted for ≥5 reps. */
  heaviestFor5Kg: number | null;
  /** Best estimated 1RM across all working sets. */
  best1Rm: number | null;
}

const EMPTY_BEST: PrBest = { heaviestKg: null, heaviestFor5Kg: null, best1Rm: null };

export function emptyPr(): PrBest {
  return { ...EMPTY_BEST };
}

/**
 * Reduces a list of sets (any order) to the best PR values. Warmup sets are
 * ignored. Returns nulls when there is no qualifying data.
 */
export function bestPrFromSets(sets: SetEntry[]): PrBest {
  let heaviestKg: number | null = null;
  let heaviestFor5Kg: number | null = null;
  let best1Rm: number | null = null;
  for (const s of sets) {
    if (s.isWarmup) continue;
    if (s.reps <= 0 || s.weightKg <= 0) continue;
    if (heaviestKg === null || s.weightKg > heaviestKg) heaviestKg = s.weightKg;
    if (s.reps >= 5 && (heaviestFor5Kg === null || s.weightKg > heaviestFor5Kg)) {
      heaviestFor5Kg = s.weightKg;
    }
    const e1rm = estimatedOneRm(s.weightKg, s.reps);
    if (best1Rm === null || e1rm > best1Rm) best1Rm = e1rm;
  }
  return { heaviestKg, heaviestFor5Kg, best1Rm };
}

export type PrCategory = 'heaviest' | 'heaviestFor5' | 'best1Rm';

/**
 * Returns the set of PR categories that `candidate` newly breaks given the
 * `prior` PR state. Useful for showing "Neuer PR!" badges during workouts.
 */
export function newPrCategories(prior: PrBest, candidate: SetEntry): PrCategory[] {
  if (candidate.isWarmup) return [];
  if (candidate.reps <= 0 || candidate.weightKg <= 0) return [];
  const broken: PrCategory[] = [];
  if (prior.heaviestKg === null || candidate.weightKg > prior.heaviestKg) {
    broken.push('heaviest');
  }
  if (candidate.reps >= 5 && (prior.heaviestFor5Kg === null || candidate.weightKg > prior.heaviestFor5Kg)) {
    broken.push('heaviestFor5');
  }
  const e1rm = estimatedOneRm(candidate.weightKg, candidate.reps);
  if (prior.best1Rm === null || e1rm > prior.best1Rm) broken.push('best1Rm');
  return broken;
}

export type MuscleVolume = Partial<Record<MuscleGroup, number>>;
export type MuscleSetCount = Partial<Record<MuscleGroup, number>>;

interface VolumeOptions {
  /** Multiplier applied to a set's contribution to secondary muscles. */
  secondaryMultiplier?: number;
  /** Set this to true to include warmup sets (off by default). */
  includeWarmup?: boolean;
}

/**
 * Sums volume (weight × reps) per muscle group across the given sets. Primary
 * muscles get full credit; secondary muscles get half credit by default.
 */
export function volumePerMuscleGroup(
  sets: SetEntry[],
  exercisesById: Map<string, Exercise>,
  opts: VolumeOptions = {},
): MuscleVolume {
  const secondary = opts.secondaryMultiplier ?? 0.5;
  const out: MuscleVolume = {};
  for (const s of sets) {
    if (!opts.includeWarmup && s.isWarmup) continue;
    if (s.weightKg <= 0 || s.reps <= 0) continue;
    const ex = exercisesById.get(s.exerciseId);
    if (!ex) continue;
    const vol = s.weightKg * s.reps;
    for (const m of ex.primaryMuscles) out[m] = (out[m] ?? 0) + vol;
    for (const m of ex.secondaryMuscles) out[m] = (out[m] ?? 0) + vol * secondary;
  }
  return out;
}

/**
 * Counts working sets per muscle group. Each set contributes 1 count to every
 * one of its primary muscle groups (secondary muscles are excluded — these are
 * the "10-20 working sets per week" the roadmap references).
 */
export function workingSetsPerMuscleGroup(
  sets: SetEntry[],
  exercisesById: Map<string, Exercise>,
): MuscleSetCount {
  const out: MuscleSetCount = {};
  for (const s of sets) {
    if (s.isWarmup) continue;
    if (s.weightKg <= 0 || s.reps <= 0) continue;
    const ex = exercisesById.get(s.exerciseId);
    if (!ex) continue;
    for (const m of ex.primaryMuscles) out[m] = (out[m] ?? 0) + 1;
  }
  return out;
}

/* ─────────────────────── Time windows ─────────────────────── */

/** Returns the local midnight timestamp of Monday (week start) for `ts`. */
export function startOfIsoWeek(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  // getDay(): 0 = Sunday, 1 = Monday … Adjust so Monday becomes the anchor.
  const dayOfWeek = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dayOfWeek);
  return d.getTime();
}

/** Adds `weeks` weeks to a week-start timestamp. */
export function addWeeks(weekStart: number, weeks: number): number {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + weeks * 7);
  return d.getTime();
}

/** Returns the [start, endExclusive) range of the local day containing `ts`. */
export function dayRange(ts: number): [number, number] {
  const start = new Date(ts);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start.getTime(), end.getTime()];
}

export function isoDayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/* ─────────────────────── Weekly aggregation ─────────────────────── */

export interface WeeklyVolumeBucket {
  weekStart: number;
  weekEnd: number;
  volume: MuscleVolume;
  setCount: MuscleSetCount;
}

/**
 * Buckets sets into weekly windows ending with `nowWeekStart` (= the week of
 * the most recent `now` value). Returns an array of length `weeks`, ordered
 * oldest → newest.
 */
export function weeklyMuscleVolume(
  sets: SetEntry[],
  exercisesById: Map<string, Exercise>,
  now: number,
  weeks: number,
): WeeklyVolumeBucket[] {
  const currentWeek = startOfIsoWeek(now);
  const buckets: WeeklyVolumeBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addWeeks(currentWeek, -i);
    const end = addWeeks(start, 1);
    const slice = sets.filter((s) => s.completedAt >= start && s.completedAt < end);
    buckets.push({
      weekStart: start,
      weekEnd: end,
      volume: volumePerMuscleGroup(slice, exercisesById),
      setCount: workingSetsPerMuscleGroup(slice, exercisesById),
    });
  }
  return buckets;
}

export type AmpelStatus = 'below' | 'in_range' | 'above' | 'no_baseline';

export interface MuscleAmpel {
  muscle: MuscleGroup;
  currentVolume: number;
  currentSets: number;
  baselineVolume: number; // mean of the 4 weeks before "this week"
  status: AmpelStatus;
}

const AMPEL_LOWER = 0.8;
const AMPEL_UPPER = 1.2;

export function muscleAmpelFromWeeks(
  buckets: WeeklyVolumeBucket[],
  muscles: MuscleGroup[],
): MuscleAmpel[] {
  if (buckets.length === 0) {
    return muscles.map((m) => ({
      muscle: m,
      currentVolume: 0,
      currentSets: 0,
      baselineVolume: 0,
      status: 'no_baseline' as AmpelStatus,
    }));
  }
  const current = buckets[buckets.length - 1];
  const baselineWindow = buckets.slice(-5, -1); // up to 4 prior full weeks
  return muscles.map((m) => {
    const currentVolume = current.volume[m] ?? 0;
    const currentSets = current.setCount[m] ?? 0;
    const baselineMean =
      baselineWindow.length > 0
        ? baselineWindow.reduce((acc, b) => acc + (b.volume[m] ?? 0), 0) / baselineWindow.length
        : 0;
    let status: AmpelStatus;
    if (baselineMean === 0) {
      // No history → only highlight when there *is* current volume.
      status = currentVolume > 0 ? 'in_range' : 'no_baseline';
    } else if (currentVolume < baselineMean * AMPEL_LOWER) {
      status = 'below';
    } else if (currentVolume > baselineMean * AMPEL_UPPER) {
      status = 'above';
    } else {
      status = 'in_range';
    }
    return { muscle: m, currentVolume, currentSets, baselineVolume: baselineMean, status };
  });
}

/* ─────────────────────── Streak ─────────────────────── */

/**
 * Count of consecutive training days ending at `now` (or the most recent
 * training day if today wasn't trained). Only counts finished workouts.
 */
export function streakDays(workouts: Workout[], now: number): number {
  const finishedDays = new Set<string>();
  for (const w of workouts) {
    if (!w.finishedAt) continue;
    finishedDays.add(isoDayKey(w.startedAt));
  }
  if (finishedDays.size === 0) return 0;
  const today = isoDayKey(now);
  const cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  // If today wasn't trained yet, start counting from yesterday to avoid
  // penalising mid-day usage.
  if (!finishedDays.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (finishedDays.has(isoDayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* ─────────────────────── Per-workout aggregation ─────────────────────── */

export interface ExerciseWorkoutPoint {
  workoutId: string;
  startedAt: number;
  topWeightKg: number;
  volumeKg: number;
}

/**
 * For one exercise: groups the user's sets by workout and reports the heaviest
 * weight + total volume per workout, ordered oldest → newest. Warmup sets are
 * excluded.
 */
export function perWorkoutExerciseStats(
  sets: SetEntry[],
  workoutsById: Map<string, Workout>,
): ExerciseWorkoutPoint[] {
  const byWorkout = new Map<string, { sets: SetEntry[] }>();
  for (const s of sets) {
    if (s.isWarmup) continue;
    if (s.weightKg <= 0 || s.reps <= 0) continue;
    const slot = byWorkout.get(s.workoutId) ?? { sets: [] };
    slot.sets.push(s);
    byWorkout.set(s.workoutId, slot);
  }
  const points: ExerciseWorkoutPoint[] = [];
  for (const [workoutId, { sets: ws }] of byWorkout.entries()) {
    const w = workoutsById.get(workoutId);
    if (!w) continue;
    const topWeightKg = ws.reduce((m, s) => Math.max(m, s.weightKg), 0);
    const volumeKg = ws.reduce((acc, s) => acc + s.weightKg * s.reps, 0);
    points.push({ workoutId, startedAt: w.startedAt, topWeightKg, volumeKg });
  }
  points.sort((a, b) => a.startedAt - b.startedAt);
  return points;
}

export type TimeRange = '1m' | '3m' | '6m' | '1y' | 'all';

const RANGE_DAYS: Record<TimeRange, number | null> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  all: null,
};

export function filterByTimeRange<T extends { startedAt: number }>(
  points: T[],
  range: TimeRange,
  now: number,
): T[] {
  const days = RANGE_DAYS[range];
  if (days === null) return points;
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return points.filter((p) => p.startedAt >= cutoff);
}
