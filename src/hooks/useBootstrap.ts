import { useEffect, useState } from 'react';
import {
  ensureSettings,
  reconcileNewSeedExercises,
  reconcileSeedExerciseMovementPatterns,
  reconcileSeedExerciseVideos,
  seedExercisesIfEmpty,
  seedFoodsIfEmpty,
} from '../db/database';

/**
 * One-time DB initialisation on first render: make sure the settings row
 * exists and the seed exercise library is loaded.
 */
export function useBootstrap() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureSettings();
      await seedExercisesIfEmpty();
      await seedFoodsIfEmpty();
      await reconcileNewSeedExercises();
      await reconcileSeedExerciseVideos();
      await reconcileSeedExerciseMovementPatterns();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
