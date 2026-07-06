import { describe, expect, it } from 'vitest';
import { calculatePlates, PLATES_KG, PLATES_LB } from '../plateCalculator';

describe('calculatePlates (kg)', () => {
  it('returns just the bar for a target at or below bar weight', () => {
    const result = calculatePlates(20, PLATES_KG.barWeight, PLATES_KG.plateOptions);
    expect(result.perSidePlates).toEqual([]);
    expect(result.remainder).toBe(0);

    const under = calculatePlates(10, PLATES_KG.barWeight, PLATES_KG.plateOptions);
    expect(under.perSidePlates).toEqual([]);
  });

  it('greedily picks largest plates first for an exact target', () => {
    // 100kg target, 20kg bar -> 40kg per side -> 25 + 15 (greedy prefers fewest plates)
    const result = calculatePlates(100, PLATES_KG.barWeight, PLATES_KG.plateOptions);
    expect(result.perSidePlates).toEqual([25, 15]);
    expect(result.remainder).toBe(0);
  });

  it('handles a target requiring the smallest plate', () => {
    // 60kg target, 20kg bar -> 20kg per side -> 20
    const result = calculatePlates(60, PLATES_KG.barWeight, PLATES_KG.plateOptions);
    expect(result.perSidePlates).toEqual([20]);
  });

  it('reports a remainder when the target is not exactly achievable', () => {
    // 20kg bar + 1kg per side (2kg total) isn't reachable with min 1.25kg plates.
    const result = calculatePlates(22, PLATES_KG.barWeight, PLATES_KG.plateOptions);
    expect(result.remainder).toBeCloseTo(1, 5);
  });
});

describe('calculatePlates (lbs)', () => {
  it('picks the standard 45lb plate set correctly', () => {
    // 225lb target, 45lb bar -> 90lb per side -> two 45s (greedy prefers fewest plates)
    const result = calculatePlates(225, PLATES_LB.barWeight, PLATES_LB.plateOptions);
    expect(result.perSidePlates).toEqual([45, 45]);
    expect(result.remainder).toBe(0);
  });

  it('picks a mixed set when the exact multiple of the largest plate is unavailable', () => {
    // 205lb target, 45lb bar -> 80lb per side -> 45 + 35
    const result = calculatePlates(205, PLATES_LB.barWeight, PLATES_LB.plateOptions);
    expect(result.perSidePlates).toEqual([45, 35]);
    expect(result.remainder).toBe(0);
  });
});
