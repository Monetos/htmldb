export interface WarmupStep {
  percent: number;
  weightKg: number;
}

/**
 * Fixed percentage ramps. 3/4-set schemes follow the widely-used 5/3/1-style
 * ramp convention; 2/5-set options extend the same low-biased spacing.
 */
const WARMUP_SCHEMES: Record<number, number[]> = {
  2: [50, 75],
  3: [40, 60, 80],
  4: [40, 55, 70, 85],
  5: [30, 50, 65, 80, 90],
};

export const WARMUP_SET_COUNT_OPTIONS = [2, 3, 4, 5] as const;

/**
 * Generates a percentage ramp of `count` warmup sets leading into
 * `targetWeightKg`. Weight is rounded to the nearest 2.5kg — the smallest
 * increment loadable evenly per side — so generated sets are actually
 * achievable on a barbell.
 */
export function generateWarmupSteps(targetWeightKg: number, count: number): WarmupStep[] {
  const scheme = WARMUP_SCHEMES[count];
  if (!scheme) return [];
  return scheme.map((percent) => ({
    percent,
    weightKg: Math.round((targetWeightKg * (percent / 100)) / 2.5) * 2.5,
  }));
}
