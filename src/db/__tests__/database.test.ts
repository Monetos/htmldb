import { describe, expect, it } from 'vitest';
import {
  db,
  ensureSettings,
  reconcileSeedExerciseMovementPatterns,
  reconcileSeedExerciseVideos,
  seedExercisesIfEmpty,
} from '../database';
import { SEED_EXERCISES } from '../seedExercises';
import { DEFAULT_DAILY_TARGETS } from '../schema';

describe('ensureSettings', () => {
  it('creates a singleton row when the table is empty', async () => {
    expect(await db.settings.count()).toBe(0);

    const settings = await ensureSettings();

    expect(settings.id).toBe('singleton');
    expect(settings.theme).toBe('dark');
    expect(settings.dailyTargets).toEqual(DEFAULT_DAILY_TARGETS);
    expect(await db.settings.count()).toBe(1);
  });

  it('returns the existing row on subsequent calls and never duplicates it', async () => {
    const first = await ensureSettings();
    await db.settings.update('singleton', { theme: 'light' });

    const second = await ensureSettings();

    expect(second.id).toBe(first.id);
    expect(second.theme).toBe('light');
    expect(await db.settings.count()).toBe(1);
  });
});

describe('FitnessDatabase schema', () => {
  it('exposes every table declared in the roadmap', () => {
    const tableNames = db.tables.map((t) => t.name).sort();
    expect(tableNames).toEqual(
      [
        'bodyMetrics',
        'exercises',
        'foodLog',
        'foods',
        'progressPhotos',
        'routines',
        'sets',
        'settings',
        'waterLog',
        'workouts',
      ].sort(),
    );
  });

  it('indexes exercises by name, primaryMuscles (multi-entry), equipment and isCustom', () => {
    const indexes = db.table('exercises').schema.indexes;
    const names = indexes.map((i) => i.name);
    expect(names).toEqual(expect.arrayContaining(['name', 'primaryMuscles', 'equipment', 'isCustom']));
    const primary = indexes.find((i) => i.name === 'primaryMuscles');
    expect(primary?.multi).toBe(true);
  });
});

describe('reconcileSeedExerciseVideos', () => {
  it('patches a drifted videoUrl back to the current SEED_EXERCISES content', async () => {
    await seedExercisesIfEmpty();
    const first = SEED_EXERCISES[0];
    await db.exercises.update(first.id, { videoUrl: 'https://example.com/stale' });

    const patched = await reconcileSeedExerciseVideos();
    expect(patched).toBeGreaterThanOrEqual(1);

    const reloaded = await db.exercises.get(first.id);
    expect(reloaded?.videoUrl).toBe(first.videoUrl);
  });

  it('is idempotent: a second call patches nothing once already in sync', async () => {
    await seedExercisesIfEmpty();
    await reconcileSeedExerciseVideos();
    const second = await reconcileSeedExerciseVideos();
    expect(second).toBe(0);
  });
});

describe('reconcileSeedExerciseMovementPatterns', () => {
  it('patches a drifted movementPattern back to the current SEED_EXERCISES content', async () => {
    await seedExercisesIfEmpty();
    const first = SEED_EXERCISES[0];
    await db.exercises.update(first.id, { movementPattern: undefined });

    const patched = await reconcileSeedExerciseMovementPatterns();
    expect(patched).toBeGreaterThanOrEqual(1);

    const reloaded = await db.exercises.get(first.id);
    expect(reloaded?.movementPattern).toBe(first.movementPattern);
  });

  it('is idempotent: a second call patches nothing once already in sync', async () => {
    await seedExercisesIfEmpty();
    await reconcileSeedExerciseMovementPatterns();
    const second = await reconcileSeedExerciseMovementPatterns();
    expect(second).toBe(0);
  });
});
