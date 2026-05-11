import { describe, expect, it } from 'vitest';
import { db, ensureSettings } from '../database';
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
