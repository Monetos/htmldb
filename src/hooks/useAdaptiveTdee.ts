import { useEffect } from 'react';
import { maybeRecalcTdee } from '../features/nutrition/tdeeService';

/**
 * One check per app load. Internally a cheap no-op whenever the feature is
 * disabled or the weekly cadence gate hasn't elapsed yet — kept separate from
 * useBootstrap since this is a recurring computed side effect, not one-time
 * seed-data initialisation.
 */
export function useAdaptiveTdee() {
  useEffect(() => {
    void maybeRecalcTdee(Date.now());
  }, []);
}
