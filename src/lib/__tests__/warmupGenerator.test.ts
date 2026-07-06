import { describe, expect, it } from 'vitest';
import { generateWarmupSteps, WARMUP_SET_COUNT_OPTIONS } from '../warmupGenerator';

describe('generateWarmupSteps', () => {
  it('returns an empty array for an unsupported count', () => {
    expect(generateWarmupSteps(100, 1)).toEqual([]);
    expect(generateWarmupSteps(100, 6)).toEqual([]);
  });

  it('generates the 3-set 40/60/80 scheme, rounded to the nearest 2.5kg', () => {
    const steps = generateWarmupSteps(100, 3);
    expect(steps).toEqual([
      { percent: 40, weightKg: 40 },
      { percent: 60, weightKg: 60 },
      { percent: 80, weightKg: 80 },
    ]);
  });

  it('generates the 4-set 40/55/70/85 scheme', () => {
    const steps = generateWarmupSteps(100, 4);
    expect(steps.map((s) => s.percent)).toEqual([40, 55, 70, 85]);
    expect(steps.map((s) => s.weightKg)).toEqual([40, 55, 70, 85]);
  });

  it('generates the 2-set 50/75 scheme', () => {
    expect(generateWarmupSteps(100, 2).map((s) => s.weightKg)).toEqual([50, 75]);
  });

  it('generates the 5-set 30/50/65/80/90 scheme', () => {
    expect(generateWarmupSteps(100, 5).map((s) => s.weightKg)).toEqual([30, 50, 65, 80, 90]);
  });

  it('rounds a non-round target weight to the nearest 2.5kg increment', () => {
    // 40% of 82.5 = 33 -> rounds to 32.5 (nearest 2.5kg)
    const steps = generateWarmupSteps(82.5, 3);
    expect(steps[0].weightKg).toBe(32.5);
  });

  it('exposes exactly the supported counts', () => {
    expect(WARMUP_SET_COUNT_OPTIONS).toEqual([2, 3, 4, 5]);
  });
});
