import Dexie, { type Table } from 'dexie';
import {
  type BodyMetric,
  type Exercise,
  type Food,
  type FoodLogEntry,
  type ProgressPhoto,
  type Routine,
  type SetEntry,
  type Settings,
  type WaterLogEntry,
  type Workout,
  DEFAULT_DAILY_TARGETS,
} from './schema';
import { SEED_EXERCISES } from './seedExercises';
import { SEED_FOODS } from './seedFoods';

export class FitnessDatabase extends Dexie {
  exercises!: Table<Exercise, string>;
  routines!: Table<Routine, string>;
  workouts!: Table<Workout, string>;
  sets!: Table<SetEntry, string>;
  bodyMetrics!: Table<BodyMetric, string>;
  progressPhotos!: Table<ProgressPhoto, string>;
  foods!: Table<Food, string>;
  foodLog!: Table<FoodLogEntry, string>;
  waterLog!: Table<WaterLogEntry, string>;
  settings!: Table<Settings, 'singleton'>;

  constructor() {
    super('fitness');

    this.version(1).stores({
      exercises: 'id, name, *primaryMuscles, equipment, isCustom',
      routines: 'id, name, createdAt',
      workouts: 'id, date, startedAt',
      sets: 'id, workoutId, exerciseId, completedAt',
      bodyMetrics: 'id, date',
      progressPhotos: 'id, date',
      foods: 'id, name, isCustom',
      foodLog: 'id, date, mealType',
      waterLog: 'id, date',
      settings: 'id',
    });
  }
}

export const db = new FitnessDatabase();

export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.get('singleton');
  if (existing) return existing;
  const initial: Settings = {
    id: 'singleton',
    dailyTargets: { ...DEFAULT_DAILY_TARGETS },
    theme: 'dark',
    updatedAt: Date.now(),
  };
  await db.settings.put(initial);
  return initial;
}

/**
 * Insert the seed exercise library if (and only if) the user has no exercises
 * yet. Wrapped in a transaction so concurrent calls (e.g. React strict-mode
 * double-mount, multiple parallel test renders) can't both insert.
 */
export async function seedExercisesIfEmpty(): Promise<number> {
  return await db.transaction('rw', db.exercises, async () => {
    const count = await db.exercises.count();
    if (count > 0) return 0;
    const now = Date.now();
    const rows = SEED_EXERCISES.map((e) => ({ ...e, createdAt: now }));
    await db.exercises.bulkAdd(rows);
    return rows.length;
  });
}

/**
 * Same idempotent contract as seedExercisesIfEmpty but for the foods table.
 */
export async function seedFoodsIfEmpty(): Promise<number> {
  return await db.transaction('rw', db.foods, async () => {
    const count = await db.foods.count();
    if (count > 0) return 0;
    const now = Date.now();
    const rows = SEED_FOODS.map((f) => ({ ...f, createdAt: now }));
    await db.foods.bulkAdd(rows);
    return rows.length;
  });
}
