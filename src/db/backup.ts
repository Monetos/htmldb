import { db } from './database';
import type {
  BodyMetric,
  Exercise,
  Food,
  FoodLogEntry,
  Routine,
  SetEntry,
  Settings,
  WaterLogEntry,
  Workout,
} from './schema';

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: number;
  exercises: Exercise[];
  routines: Routine[];
  workouts: Workout[];
  sets: SetEntry[];
  bodyMetrics: BodyMetric[];
  foods: Food[];
  foodLog: FoodLogEntry[];
  waterLog: WaterLogEntry[];
  settings: Settings[];
}

/** ProgressPhotos hold Blob payloads → excluded from JSON for now. */
export async function exportBackup(): Promise<BackupPayload> {
  const [exercises, routines, workouts, sets, bodyMetrics, foods, foodLog, waterLog, settings] =
    await Promise.all([
      db.exercises.toArray(),
      db.routines.toArray(),
      db.workouts.toArray(),
      db.sets.toArray(),
      db.bodyMetrics.toArray(),
      db.foods.toArray(),
      db.foodLog.toArray(),
      db.waterLog.toArray(),
      db.settings.toArray(),
    ]);
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    exercises,
    routines,
    workouts,
    sets,
    bodyMetrics,
    foods,
    foodLog,
    waterLog,
    settings,
  };
}

export interface ImportSummary {
  exercises: number;
  routines: number;
  workouts: number;
  sets: number;
  bodyMetrics: number;
  foods: number;
  foodLog: number;
  waterLog: number;
  settings: number;
}

export class BackupParseError extends Error {}

function ensureArray<T>(value: unknown, name: string): T[] {
  if (!Array.isArray(value)) {
    throw new BackupParseError(`Erwarte ein Array für "${name}".`);
  }
  return value as T[];
}

/** Validates and parses a JSON string. Does not write to the DB. */
export function parseBackup(json: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new BackupParseError(`Ungültiges JSON: ${(e as Error).message}`);
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new BackupParseError('Backup ist kein Objekt.');
  }
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.schemaVersion !== 'number') {
    throw new BackupParseError('schemaVersion fehlt.');
  }
  if (obj.schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupParseError(
      `Backup ist neuer (v${obj.schemaVersion}) als diese App-Version (v${BACKUP_SCHEMA_VERSION}).`,
    );
  }
  return {
    schemaVersion: obj.schemaVersion,
    exportedAt: typeof obj.exportedAt === 'number' ? obj.exportedAt : 0,
    exercises: ensureArray<Exercise>(obj.exercises ?? [], 'exercises'),
    routines: ensureArray<Routine>(obj.routines ?? [], 'routines'),
    workouts: ensureArray<Workout>(obj.workouts ?? [], 'workouts'),
    sets: ensureArray<SetEntry>(obj.sets ?? [], 'sets'),
    bodyMetrics: ensureArray<BodyMetric>(obj.bodyMetrics ?? [], 'bodyMetrics'),
    foods: ensureArray<Food>(obj.foods ?? [], 'foods'),
    foodLog: ensureArray<FoodLogEntry>(obj.foodLog ?? [], 'foodLog'),
    waterLog: ensureArray<WaterLogEntry>(obj.waterLog ?? [], 'waterLog'),
    settings: ensureArray<Settings>(obj.settings ?? [], 'settings'),
  };
}

/**
 * Replaces all data in the database with the backup payload. Destructive.
 * progressPhotos table is left untouched (we don't back up Blobs yet).
 */
export async function restoreBackup(payload: BackupPayload): Promise<ImportSummary> {
  return await db.transaction(
    'rw',
    [
      db.exercises,
      db.routines,
      db.workouts,
      db.sets,
      db.bodyMetrics,
      db.foods,
      db.foodLog,
      db.waterLog,
      db.settings,
    ],
    async () => {
      await Promise.all([
        db.exercises.clear(),
        db.routines.clear(),
        db.workouts.clear(),
        db.sets.clear(),
        db.bodyMetrics.clear(),
        db.foods.clear(),
        db.foodLog.clear(),
        db.waterLog.clear(),
        db.settings.clear(),
      ]);
      await Promise.all([
        db.exercises.bulkAdd(payload.exercises),
        db.routines.bulkAdd(payload.routines),
        db.workouts.bulkAdd(payload.workouts),
        db.sets.bulkAdd(payload.sets),
        db.bodyMetrics.bulkAdd(payload.bodyMetrics),
        db.foods.bulkAdd(payload.foods),
        db.foodLog.bulkAdd(payload.foodLog),
        db.waterLog.bulkAdd(payload.waterLog),
        db.settings.bulkAdd(payload.settings),
      ]);
      return {
        exercises: payload.exercises.length,
        routines: payload.routines.length,
        workouts: payload.workouts.length,
        sets: payload.sets.length,
        bodyMetrics: payload.bodyMetrics.length,
        foods: payload.foods.length,
        foodLog: payload.foodLog.length,
        waterLog: payload.waterLog.length,
        settings: payload.settings.length,
      };
    },
  );
}

export function backupFilename(now: Date = new Date()): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `fitness-backup-${yyyy}-${mm}-${dd}.json`;
}
