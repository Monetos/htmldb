import { describe, expect, it } from 'vitest';
import {
  formatWeightInUnit,
  kgToLb,
  kgToUnit,
  lbToKg,
  parseWeightInput,
  unitToKg,
} from '../units';

describe('kgToLb / lbToKg', () => {
  it('converts kg to lb', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 3);
  });

  it('converts lb to kg', () => {
    expect(lbToKg(220.462)).toBeCloseTo(100, 3);
  });

  it('round-trips within floating-point tolerance', () => {
    expect(lbToKg(kgToLb(83.5))).toBeCloseTo(83.5, 6);
  });
});

describe('kgToUnit / unitToKg', () => {
  it('passes kg through unchanged for unit=kg', () => {
    expect(kgToUnit(60, 'kg')).toBe(60);
    expect(unitToKg(60, 'kg')).toBe(60);
  });

  it('converts for unit=lbs', () => {
    expect(kgToUnit(100, 'lbs')).toBeCloseTo(220.462, 3);
    expect(unitToKg(220.462, 'lbs')).toBeCloseTo(100, 3);
  });
});

describe('formatWeightInUnit', () => {
  it('delegates to formatWeight for kg (integers compact, fractions to 1 decimal)', () => {
    expect(formatWeightInUnit(60, 'kg')).toBe('60');
    expect(formatWeightInUnit(60.5, 'kg')).toBe('60.5');
  });

  it('rounds lbs to the nearest whole pound', () => {
    expect(formatWeightInUnit(100, 'lbs')).toBe('220');
    expect(formatWeightInUnit(1, 'lbs')).toBe('2');
  });
});

describe('parseWeightInput', () => {
  it('returns undefined for blank input', () => {
    expect(parseWeightInput('', 'kg')).toBeUndefined();
    expect(parseWeightInput('   ', 'lbs')).toBeUndefined();
  });

  it('returns undefined for invalid input', () => {
    expect(parseWeightInput('abc', 'kg')).toBeUndefined();
  });

  it('parses a kg value as-is', () => {
    expect(parseWeightInput('60', 'kg')).toBe(60);
  });

  it('accepts a comma decimal separator', () => {
    expect(parseWeightInput('60,5', 'kg')).toBe(60.5);
  });

  it('converts an lbs value to kg', () => {
    expect(parseWeightInput('220.462', 'lbs')).toBeCloseTo(100, 3);
  });
});
