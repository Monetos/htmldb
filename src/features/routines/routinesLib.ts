import { db } from '../../db/database';
import type { Routine, RoutineExercise, Workout } from '../../db/schema';
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
