import type { WeightUnit } from '../db/schema';
import { formatWeight } from './format';

/** 1 kg = 2.20462 lb — standard gym-conversion precision. */
export const KG_TO_LB = 2.20462;

export function kgToLb(kg: number): number {
  return kg * KG_TO_LB;
}

export function lbToKg(lb: number): number {
  return lb / KG_TO_LB;
}

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === 'lbs' ? kgToLb(kg) : kg;
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === 'lbs' ? lbToKg(value) : value;
}

/**
 * kg keeps formatWeight's existing precision (integers compact, else 1
 * decimal). lbs rounds to the nearest whole pound — gym-floor convention
 * never racks fractional plates finer than that.
 */
export function formatWeightInUnit(kg: number, unit: WeightUnit): string {
  if (unit === 'kg') return formatWeight(kg);
  return String(Math.round(kgToLb(kg)));
}

/**
 * Parses user input typed in `unit` (comma-decimal tolerant, matching the
 * existing num()-helper convention in BodyMetricFormPage) and returns kg for
 * storage. Returns undefined for blank/invalid input.
 */
export function parseWeightInput(raw: string, unit: WeightUnit): number | undefined {
  if (raw.trim() === '') return undefined;
  const v = Number(raw.replace(',', '.'));
  if (!Number.isFinite(v)) return undefined;
  return unitToKg(v, unit);
}
