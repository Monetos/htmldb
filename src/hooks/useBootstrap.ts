import { useEffect, useState } from 'react';
import {
  ensureSettings,
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
      await reconcileSeedExerciseVideos();
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
