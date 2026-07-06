// Domain types for IndexedDB (Dexie). Pure data, no Dexie imports — these
// describe rows, while src/db/database.ts wires them up as tables.

export type MuscleGroup =
  | 'chest'
  | 'back_lats'
  | 'back_traps'
  | 'back_rhomboids'
  | 'shoulders_front'
  | 'shoulders_side'
  | 'shoulders_rear'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abs'
  | 'lower_back';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight';

export type ExerciseCategory = 'compound' | 'isolation';

export interface ExerciseExecution {
  setup: string;
  movement: string;
  cues: string[];
  commonMistakes: string[];
}

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  execution: ExerciseExecution;
  videoUrl?: string;
  defaultRestSeconds: number;
  isCustom: boolean;
  createdAt: number;
}

export interface RoutineExercise {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRestSeconds: number;
  note?: string;
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  exercises: RoutineExercise[];
  createdAt: number;
}

export interface Workout {
  id: string;
  date: number;
  routineId?: string;
  routineName?: string;
  startedAt: number;
  finishedAt?: number;
  notes?: string;
  bodyweightKg?: number;
}

export interface SetEntry {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  isWarmup: boolean;
  completedAt: number;
}

export interface BodyMeasurements {
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  bicepLeftCm?: number;
  bicepRightCm?: number;
  thighLeftCm?: number;
  thighRightCm?: number;
  calfLeftCm?: number;
  calfRightCm?: number;
}

export interface BodyMetric {
  id: string;
  date: number;
  weightKg?: number;
  bodyFatPercent?: number;
  measurements?: BodyMeasurements;
  notes?: string;
}

export type PhotoView = 'front' | 'side' | 'back';

export interface ProgressPhoto {
  id: string;
  date: number;
  imageBlob: Blob;
  view: PhotoView;
  notes?: string;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  per100g: Macros;
  isCustom: boolean;
  createdAt: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLogEntry {
  id: string;
  date: number;
  foodId: string;
  amountG: number;
  mealType: MealType;
  loggedAt: number;
}

export interface WaterLogEntry {
  id: string;
  date: number;
  amountMl: number;
  loggedAt: number;
}

export interface DailyTargets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

export type ThemeMode = 'light' | 'dark';

export interface Settings {
  id: 'singleton';
  dailyTargets: DailyTargets;
  theme: ThemeMode;
  updatedAt: number;
  /** Wall-clock timestamp of the last successful JSON backup export. */
  lastBackupAt?: number;
  /** Anthropic API key for the AI food estimation features (stored locally only). */
  anthropicApiKey?: string;
}

export const DEFAULT_DAILY_TARGETS: DailyTargets = {
  kcal: 2500,
  proteinG: 180,
  carbsG: 280,
  fatG: 80,
  waterMl: 3000,
};

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Brust',
  back_lats: 'Latissimus',
  back_traps: 'Trapez',
  back_rhomboids: 'Rhomboiden',
  shoulders_front: 'Schulter vorn',
  shoulders_side: 'Schulter seitlich',
  shoulders_rear: 'Schulter hinten',
  biceps: 'Bizeps',
  triceps: 'Trizeps',
  forearms: 'Unterarm',
  quads: 'Quadrizeps',
  hamstrings: 'Beinbeuger',
  glutes: 'Gesäß',
  calves: 'Waden',
  abs: 'Bauch',
  lower_back: 'Unterer Rücken',
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: 'Langhantel',
  dumbbell: 'Kurzhantel',
  machine: 'Maschine',
  cable: 'Kabelzug',
  bodyweight: 'Körpergewicht',
};
