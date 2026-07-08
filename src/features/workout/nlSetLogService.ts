// DB-touching orchestrator for natural-language set logging: builds the
// exercise candidate list for workoutAiLib's schema-enum resolution, and
// commits confirmed groups/sets via workoutLib.addSet. No rest-timer logic
// here — that stays UI-layer, exactly like the manual logging flow.

import { db } from '../../db/database';
import type { SetEntry } from '../../db/schema';
import { addSet } from './workoutLib';
import type { NlParsedSet, NlSetLogGroup } from './workoutAiLib';

export interface ExerciseCandidate {
  id: string;
  name: string;
}

export async function fetchExerciseCandidates(): Promise<ExerciseCandidate[]> {
  const exercises = await db.exercises.toArray();
  return exercises.map((e) => ({ id: e.id, name: e.name }));
}

async function commitSets(workoutId: string, exerciseId: string, sets: NlParsedSet[]): Promise<SetEntry[]> {
  const created: SetEntry[] = [];
  // Sequential, not Promise.all — addSet re-queries existing sets per (workoutId, exerciseId)
  // to compute setNumber, so concurrent calls would race and produce wrong/duplicate numbers.
  for (const s of sets) {
    const row = await addSet({
      workoutId,
      exerciseId,
      weightKg: s.weightKg,
      reps: s.reps,
      rpe: s.rpe,
      isWarmup: s.isWarmup,
      toFailure: s.toFailure,
    });
    created.push(row);
  }
  return created;
}

/**
 * Commits every resolved group's sets, group by group and set by set.
 * Groups with exerciseId === null are silently skipped — the review UI must
 * resolve or discard them before this is ever called, so reaching here with
 * an unresolved group would only happen if that UI contract was violated.
 */
export async function commitNlSetLogGroups(workoutId: string, groups: NlSetLogGroup[]): Promise<SetEntry[]> {
  const created: SetEntry[] = [];
  for (const group of groups) {
    if (!group.exerciseId) continue;
    created.push(...(await commitSets(workoutId, group.exerciseId, group.sets)));
  }
  return created;
}

export async function commitNlSetShorthand(
  workoutId: string,
  exerciseId: string,
  sets: NlParsedSet[],
): Promise<SetEntry[]> {
  return commitSets(workoutId, exerciseId, sets);
}
