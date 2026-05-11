export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function formatWorkoutLength(startedAt: number, finishedAt?: number): string {
  if (!finishedAt) return '–';
  const totalMin = Math.max(0, Math.round((finishedAt - startedAt) / 60_000));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}min`;
}

export function formatWeight(kg: number): string {
  // Keep integers compact, fractions to 1 decimal (e.g. 60.5)
  return Number.isInteger(kg) ? `${kg}` : kg.toFixed(1);
}

export function volumeKg(weightKg: number, reps: number, isWarmup: boolean): number {
  if (isWarmup) return 0;
  return weightKg * reps;
}
