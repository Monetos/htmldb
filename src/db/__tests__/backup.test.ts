import { describe, expect, it } from 'vitest';
import {
  BACKUP_SCHEMA_VERSION,
  BackupParseError,
  backupFilename,
  exportBackup,
  parseBackup,
  restoreBackup,
} from '../backup';
import { db, ensureSettings, seedExercisesIfEmpty } from '../database';

describe('exportBackup', () => {
  it('produces a payload with the current schema version', async () => {
    await ensureSettings();
    await seedExercisesIfEmpty();
    const payload = await exportBackup();
    expect(payload.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(payload.exportedAt).toBeGreaterThan(0);
    expect(payload.exercises.length).toBeGreaterThan(40);
    expect(payload.settings.length).toBe(1);
  });
});

describe('parseBackup', () => {
  it('rejects invalid JSON with BackupParseError', () => {
    expect(() => parseBackup('{nope')).toThrow(BackupParseError);
  });

  it('rejects payloads from a newer schema version', () => {
    const tooNew = JSON.stringify({ schemaVersion: BACKUP_SCHEMA_VERSION + 99 });
    expect(() => parseBackup(tooNew)).toThrow(/neuer/);
  });

  it('fills missing arrays with empty defaults', () => {
    const minimal = JSON.stringify({ schemaVersion: BACKUP_SCHEMA_VERSION });
    const parsed = parseBackup(minimal);
    expect(parsed.exercises).toEqual([]);
    expect(parsed.workouts).toEqual([]);
  });

  it('rejects non-array fields for known keys', () => {
    const bad = JSON.stringify({ schemaVersion: BACKUP_SCHEMA_VERSION, exercises: 'oops' });
    expect(() => parseBackup(bad)).toThrow(/exercises/);
  });
});

describe('restoreBackup', () => {
  it('clears existing data and replaces it with the payload', async () => {
    await ensureSettings();
    await seedExercisesIfEmpty();
    const before = await exportBackup();
    expect(before.exercises.length).toBeGreaterThan(0);

    const payload = parseBackup(
      JSON.stringify({
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: 0,
        exercises: [
          {
            id: 'restored-1',
            name: 'Restored Exercise',
            category: 'compound',
            primaryMuscles: ['chest'],
            secondaryMuscles: [],
            equipment: 'barbell',
            execution: { setup: 's', movement: 'm', cues: ['a'], commonMistakes: ['b'] },
            defaultRestSeconds: 120,
            isCustom: false,
            createdAt: 0,
          },
        ],
        routines: [],
        workouts: [],
        sets: [],
        bodyMetrics: [],
        foods: [],
        foodLog: [],
        waterLog: [],
        settings: [],
      }),
    );
    const summary = await restoreBackup(payload);
    expect(summary.exercises).toBe(1);
    const remaining = await db.exercises.toArray();
    expect(remaining.length).toBe(1);
    expect(remaining[0].id).toBe('restored-1');
  });
});

describe('backupFilename', () => {
  it('uses YYYY-MM-DD format', () => {
    const name = backupFilename(new Date(2026, 4, 11));
    expect(name).toBe('fitness-backup-2026-05-11.json');
  });
});
