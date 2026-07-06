import { describe, expect, it } from 'vitest';
import { estimatedOneRm } from '../progression';
import { calculateAllOneRm, ONE_RM_FORMULAS } from '../oneRepMax';

describe('ONE_RM_FORMULAS', () => {
  it('epley matches progression.ts estimatedOneRm bit-for-bit (imported, not duplicated)', () => {
    const epley = ONE_RM_FORMULAS.find((f) => f.id === 'epley')!;
    expect(epley.calculate).toBe(estimatedOneRm);
    expect(epley.calculate(100, 8)).toBe(estimatedOneRm(100, 8));
  });

  it('brzycki: 100kg x 8 reps', () => {
    const brzycki = ONE_RM_FORMULAS.find((f) => f.id === 'brzycki')!;
    expect(brzycki.calculate(100, 8)).toBeCloseTo((100 * 36) / (37 - 8), 5);
  });

  it('brzycki returns 0 at or beyond 37 reps (formula degenerates)', () => {
    const brzycki = ONE_RM_FORMULAS.find((f) => f.id === 'brzycki')!;
    expect(brzycki.calculate(100, 37)).toBe(0);
    expect(brzycki.calculate(100, 40)).toBe(0);
  });

  it('lombardi: 100kg x 8 reps', () => {
    const lombardi = ONE_RM_FORMULAS.find((f) => f.id === 'lombardi')!;
    expect(lombardi.calculate(100, 8)).toBeCloseTo(100 * Math.pow(8, 0.1), 5);
  });

  it("o'conner: 100kg x 8 reps", () => {
    const oconner = ONE_RM_FORMULAS.find((f) => f.id === 'oconner')!;
    expect(oconner.calculate(100, 8)).toBeCloseTo(100 * (1 + 8 / 40), 5);
  });

  it('mcglothin: 100kg x 8 reps', () => {
    const mcglothin = ONE_RM_FORMULAS.find((f) => f.id === 'mcglothin')!;
    expect(mcglothin.calculate(100, 8)).toBeCloseTo((100 * 100) / (101.3 - 2.67123 * 8), 5);
  });

  it.each(ONE_RM_FORMULAS.map((f) => f.id))('%s returns 0 for non-positive inputs', (id) => {
    const formula = ONE_RM_FORMULAS.find((f) => f.id === id)!;
    expect(formula.calculate(0, 5)).toBe(0);
    expect(formula.calculate(100, 0)).toBe(0);
    expect(formula.calculate(-10, 5)).toBe(0);
  });
});

describe('calculateAllOneRm', () => {
  it('returns one result per formula, in ONE_RM_FORMULAS order', () => {
    const results = calculateAllOneRm(100, 8);
    expect(results.map((r) => r.id)).toEqual(ONE_RM_FORMULAS.map((f) => f.id));
    expect(results.every((r) => r.oneRmKg > 100)).toBe(true);
  });
});
