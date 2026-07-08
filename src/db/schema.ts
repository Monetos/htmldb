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

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell';

export type ExerciseCategory = 'compound' | 'isolation';

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'horizontal_push'
  | 'horizontal_pull'
  | 'vertical_push'
  | 'vertical_pull'
  | 'lunge'
  | 'carry_core'
  | 'isolation';

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
  isFavorite?: boolean;
  movementPattern?: MovementPattern;
}

export interface RoutineExercise {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetRestSeconds: number;
  note?: string;
  /** Links this exercise to others in one superset/circuit round; members must stay contiguous by `order`. */
  groupId?: string;
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

export type UnilateralSide = 'left' | 'right';

export interface SetEntry {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  isWarmup: boolean;
  /** Drop-set: excluded from PR detection, still counts toward volume. */
  isDropSet?: boolean;
  /** Taken to muscular failure. Purely informational — no PR/volume effect. */
  toFailure?: boolean;
  /** Which side of a unilateral exercise. Purely informational — no PR/volume effect. */
  unilateralSide?: UnilateralSide;
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

export type WeightUnit = 'kg' | 'lbs';

/** A computed-but-not-yet-applied adaptive TDEE target change, awaiting user confirmation. */
export interface TdeeAdjustmentSuggestion {
  proposedKcal: number;
  proposedProteinG: number;
  proposedCarbsG: number;
  proposedFatG: number;
  proposedWaterMl: number;
  estimatedTdeeKcal: number;
  previousKcal: number;
  computedAt: number;
  /** Lazily filled in once the user requests the optional AI explanation. */
  explanation?: string;
}

export interface Settings {
  id: 'singleton';
  dailyTargets: DailyTargets;
  theme: ThemeMode;
  updatedAt: number;
  /** Wall-clock timestamp of the last successful JSON backup export. */
  lastBackupAt?: number;
  /** Anthropic API key for the AI food estimation features (stored locally only). */
  anthropicApiKey?: string;
  /** Display/input unit preference. Storage is always kg regardless of this value. */
  weightUnit?: WeightUnit;
  /** Opt-in switch for the adaptive TDEE feature. Default off. */
  adaptiveTdeeEnabled?: boolean;
  /** Deficit/surplus (kcal) vs. estimated TDEE, captured on the first successful estimate and preserved across recalculations. */
  tdeeGoalOffsetKcal?: number;
  /** Wall-clock timestamp of the last recalculation attempt (successful or not), used to gate the weekly cadence. */
  lastTdeeRecalcAt?: number;
  /** Most recent successful TDEE estimate in kcal, shown for transparency even without a pending suggestion. */
  lastTdeeEstimateKcal?: number;
  /** Set when a recalculation produces a new target; cleared on accept or reject. */
  pendingTdeeAdjustment?: TdeeAdjustmentSuggestion;
  /** Per-exercise plateau-callout dismissals, keyed by exerciseId. Auto-stale once a newer workout for that exercise exists. */
  dismissedPlateaus?: Record<string, { dismissedAt: number }>;
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
  kettlebell: 'Kettlebell',
};

export const MOVEMENT_PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: 'Kniebeuge',
  hinge: 'Hüft-Hinge',
  horizontal_push: 'Waagerechtes Drücken',
  horizontal_pull: 'Waagerechtes Ziehen',
  vertical_push: 'Senkrechtes Drücken',
  vertical_pull: 'Senkrechtes Ziehen',
  lunge: 'Ausfallschritt',
  carry_core: 'Tragen/Rumpf',
  isolation: 'Isolation',
};
