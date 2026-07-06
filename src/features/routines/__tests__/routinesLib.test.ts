import { describe, expect, it } from 'vitest';
import {
  deleteRoutine,
  lastPerformedAt,
  lastPerformedMap,
  saveRoutine,
  startRoutineWorkout,
} from '../routinesLib';
import { db } from '../../../db/database';
import { finishWorkout, getActiveWorkout } from '../../workout/workoutLib';
import type { RoutineExercise } from '../../../db/schema';

function makeExercise(exerciseId: string, order: number): RoutineExercise {
  return {
    exerciseId,
    order,
    targetSets: 4,
    targetRepsMin: 6,
    targetRepsMax: 10,
    targetRestSeconds: 180,
  };
}

describe('saveRoutine', () => {
  it('creates a new routine with sequential order values', async () => {
    const r = await saveRoutine({
      name: '  Push Day  ',
      exercises: [makeExercise('A', 7), makeExercise('B', 1), makeExercise('C', 4)],
    });
    expect(r.id).toBeTruthy();
    expect(r.name).toBe('Push Day');
    expect(r.exercises.map((e) => e.exerciseId)).toEqual(['B', 'C', 'A']);
    expect(r.exercises.map((e) => e.order)).toEqual([0, 1, 2]);
  });

  it('preserves groupId on grouped exercises through order renumbering', async () => {
    const r = await saveRoutine({
      name: 'Superset Day',
      exercises: [
        { ...makeExercise('A', 3), groupId: 'g1' },
        { ...makeExercise('B', 4), groupId: 'g1' },
        makeExercise('C', 1),
      ],
    });
    expect(r.exercises.map((e) => e.exerciseId)).toEqual(['C', 'A', 'B']);
    expect(r.exercises.map((e) => e.order)).toEqual([0, 1, 2]);
    expect(r.exercises.find((e) => e.exerciseId === 'A')?.groupId).toBe('g1');
    expect(r.exercises.find((e) => e.exerciseId === 'B')?.groupId).toBe('g1');
    expect(r.exercises.find((e) => e.exerciseId === 'C')?.groupId).toBeUndefined();
  });

  it('updates an existing routine in place', async () => {
    const r = await saveRoutine({ name: 'Pull', exercises: [makeExercise('A', 0)] });
    const updated = await saveRoutine({
      id: r.id,
      name: 'Pull Day',
      exercises: [makeExercise('A', 0), makeExercise('B', 1)],
    });
    expect(updated.id).toBe(r.id);
    expect(updated.name).toBe('Pull Day');
    expect(updated.exercises).toHaveLength(2);
    const stored = await db.routines.toArray();
    expect(stored).toHaveLength(1);
  });
});

describe('deleteRoutine', () => {
  it('removes the routine row', async () => {
    const r = await saveRoutine({ name: 'X', exercises: [] });
    await deleteRoutine(r.id);
    expect(await db.routines.get(r.id)).toBeUndefined();
  });
});

describe('startRoutineWorkout', () => {
  it('creates a workout with the routine id and name snapshot', async () => {
    const r = await saveRoutine({ name: 'Legs', exercises: [makeExercise('A', 0)] });
    const w = await startRoutineWorkout(r);
    expect(w.routineId).toBe(r.id);
    expect(w.routineName).toBe('Legs');
    expect(w.finishedAt).toBeUndefined();
    // Renaming the routine afterwards must not alter the snapshot
    await saveRoutine({ id: r.id, name: 'Renamed', exercises: r.exercises });
    const stored = await db.workouts.get(w.id);
    expect(stored?.routineName).toBe('Legs');
  });

  it('reuses an already active workout instead of starting a second one', async () => {
    const r = await saveRoutine({ name: 'A', exercises: [] });
    const w1 = await startRoutineWorkout(r);
    const w2 = await startRoutineWorkout(r);
    expect(w2.id).toBe(w1.id);
    const active = await getActiveWorkout();
    expect(active?.id).toBe(w1.id);
  });
});

describe('lastPerformedAt / lastPerformedMap', () => {
  it('returns null when the routine has never been finished', async () => {
    const r = await saveRoutine({ name: 'A', exercises: [] });
    await startRoutineWorkout(r);
    // not finished yet
    expect(await lastPerformedAt(r.id)).toBeNull();
  });

  it('returns the most recent finished timestamp', async () => {
    const r = await saveRoutine({ name: 'A', exercises: [] });
    const w1 = await startRoutineWorkout(r);
    await finishWorkout(w1.id, {});
    await new Promise((resolve) => setTimeout(resolve, 5));
    const w2 = await startRoutineWorkout(r);
    await finishWorkout(w2.id, {});
    const last = await lastPerformedAt(r.id);
    const w2Updated = await db.workouts.get(w2.id);
    expect(last).toBe(w2Updated?.startedAt ?? null);
  });

  it('lastPerformedMap returns entries only for requested routines that have finished workouts', async () => {
    const a = await saveRoutine({ name: 'A', exercises: [] });
    const b = await saveRoutine({ name: 'B', exercises: [] });
    const w = await startRoutineWorkout(a);
    await finishWorkout(w.id, {});
    const map = await lastPerformedMap([a.id, b.id]);
    expect(map.has(a.id)).toBe(true);
    expect(map.has(b.id)).toBe(false);
  });
});
