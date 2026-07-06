import { db } from '../../db/database';
import type { Routine, RoutineExercise, Workout } from '../../db/schema';
import type { RoutineTemplate } from '../../db/routineTemplates';
import { newId } from '../../lib/id';
import { getActiveWorkout } from '../workout/workoutLib';

export async function saveRoutine(input: {
  id?: string;
  name: string;
  description?: string;
  exercises: RoutineExercise[];
}): Promise<Routine> {
  const exercises = input.exercises
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((e, i) => ({ ...e, order: i }));
  if (input.id) {
    await db.routines.update(input.id, {
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      exercises,
    });
    const updated = await db.routines.get(input.id);
    if (!updated) throw new Error('Routine konnte nicht aktualisiert werden.');
    return updated;
  }
  const routine: Routine = {
    id: newId(),
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    exercises,
    createdAt: Date.now(),
  };
  await db.routines.add(routine);
  return routine;
}

export async function deleteRoutine(id: string): Promise<void> {
  await db.routines.delete(id);
}

/**
 * Instantiates a program template as one independently-saved Routine per
 * split day. Exercise names are resolved against the current exercise
 * library; days with no resolvable exercises (or exercises the user has
 * deleted) are skipped rather than saved empty.
 */
export async function applyRoutineTemplate(template: RoutineTemplate): Promise<Routine[]> {
  const allExercises = await db.exercises.toArray();
  const idByName = new Map(allExercises.map((e) => [e.name, e.id]));

  const created: Routine[] = [];
  for (const day of template.days) {
    const exercises: RoutineExercise[] = day.exercises
      .map((te) => {
        const exerciseId = idByName.get(te.exerciseName);
        if (!exerciseId) return null;
        const routineExercise: RoutineExercise = {
          exerciseId,
          order: 0,
          targetSets: te.targetSets,
          targetRepsMin: te.targetRepsMin,
          targetRepsMax: te.targetRepsMax,
          targetRestSeconds: te.targetRestSeconds,
          groupId: te.groupId,
        };
        return routineExercise;
      })
      .filter((e): e is RoutineExercise => e !== null)
      .map((e, i) => ({ ...e, order: i }));
    if (exercises.length === 0) continue;
    created.push(await saveRoutine({ name: day.name, exercises }));
  }
  return created;
}

export async function startRoutineWorkout(routine: Routine): Promise<Workout> {
  const existing = await getActiveWorkout();
  if (existing) return existing;
  const now = Date.now();
  const workout: Workout = {
    id: newId(),
    date: now,
    startedAt: now,
    routineId: routine.id,
    routineName: routine.name,
  };
  await db.workouts.add(workout);
  return workout;
}

/** Latest finished workout that referenced this routine, or null. */
export async function lastPerformedAt(routineId: string): Promise<number | null> {
  const rows = await db.workouts
    .where('startedAt')
    .above(0)
    .reverse()
    .filter((w) => w.routineId === routineId && Boolean(w.finishedAt))
    .limit(1)
    .toArray();
  return rows[0]?.startedAt ?? null;
}

/** Lookup map of routineId → most recent finishedAt (or startedAt fallback). */
export async function lastPerformedMap(routineIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (routineIds.length === 0) return map;
  const wanted = new Set(routineIds);
  const finished = await db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((w) => Boolean(w.routineId) && wanted.has(w.routineId!) && Boolean(w.finishedAt))
    .toArray();
  for (const w of finished) {
    if (!w.routineId) continue;
    if (!map.has(w.routineId)) map.set(w.routineId, w.finishedAt ?? w.startedAt);
  }
  return map;
}
