import { estimatedOneRm } from './progression';

export type OneRmFormulaId = 'epley' | 'brzycki' | 'lombardi' | 'oconner' | 'mcglothin';

export interface OneRmFormula {
  id: OneRmFormulaId;
  label: string;
  calculate: (weightKg: number, reps: number) => number;
}

function brzycki(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0 || reps >= 37) return 0;
  return (weightKg * 36) / (37 - reps);
}

function lombardi(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  return weightKg * Math.pow(reps, 0.1);
}

function oconner(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  return weightKg * (1 + reps / 40);
}

function mcglothin(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  return (100 * weightKg) / (101.3 - 2.67123 * reps);
}

export const ONE_RM_FORMULAS: OneRmFormula[] = [
  { id: 'epley', label: 'Epley', calculate: estimatedOneRm },
  { id: 'brzycki', label: 'Brzycki', calculate: brzycki },
  { id: 'lombardi', label: 'Lombardi', calculate: lombardi },
  { id: 'oconner', label: "O'Conner", calculate: oconner },
  { id: 'mcglothin', label: 'McGlothin', calculate: mcglothin },
];

export interface OneRmResult {
  id: OneRmFormulaId;
  label: string;
  oneRmKg: number;
}

export function calculateAllOneRm(weightKg: number, reps: number): OneRmResult[] {
  return ONE_RM_FORMULAS.map((f) => ({ id: f.id, label: f.label, oneRmKg: f.calculate(weightKg, reps) }));
}
