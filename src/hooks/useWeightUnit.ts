import { useLiveQuery } from 'dexie-react-hooks';
import { useCallback } from 'react';
import { db } from '../db/database';
import type { WeightUnit } from '../db/schema';

/**
 * Backed by useLiveQuery (not useState-in-useEffect like useTheme) so a
 * write from Settings propagates live to every other component reading
 * weight — the same mechanism SettingsPage/ExerciseBlock already rely on.
 * A plain read (not ensureSettings(), which writes a default row on first
 * access) — useLiveQuery's querier must stay read-only.
 */
export function useWeightUnit() {
  const unit = useLiveQuery(() => db.settings.get('singleton'), [])?.weightUnit ?? 'kg';

  const setWeightUnit = useCallback(async (next: WeightUnit) => {
    await db.settings.update('singleton', { weightUnit: next, updatedAt: Date.now() });
  }, []);

  return { unit, setWeightUnit };
}
