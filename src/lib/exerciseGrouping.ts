export type OrderedItem =
  | { type: 'single'; exerciseId: string }
  | { type: 'group'; groupId: string; exerciseIds: string[] };

/**
 * Folds a flat exercise-id list into render-ready items, collapsing every id
 * that shares a groupId into one `group` item (positioned at the earliest
 * occurrence). Does not reorder — callers should normalize `orderedIds` with
 * `reorderForContiguousGroup` first if group members aren't already adjacent.
 */
export function groupOrderedIds(
  orderedIds: string[],
  groupIdByExerciseId: Map<string, string | undefined>,
): OrderedItem[] {
  const items: OrderedItem[] = [];
  const seenGroups = new Set<string>();
  for (const id of orderedIds) {
    const groupId = groupIdByExerciseId.get(id);
    if (!groupId) {
      items.push({ type: 'single', exerciseId: id });
      continue;
    }
    if (seenGroups.has(groupId)) continue;
    seenGroups.add(groupId);
    const exerciseIds = orderedIds.filter((x) => groupIdByExerciseId.get(x) === groupId);
    items.push({ type: 'group', groupId, exerciseIds });
  }
  return items;
}

/** Splits an already-contiguous-by-groupId list into movable blocks (size 1 = ungrouped). */
export function toContiguousBlocks<T extends { groupId?: string }>(list: T[]): T[][] {
  const blocks: T[][] = [];
  for (const item of list) {
    const last = blocks[blocks.length - 1];
    if (item.groupId && last && last[last.length - 1].groupId === item.groupId) {
      last.push(item);
    } else {
      blocks.push([item]);
    }
  }
  return blocks;
}

/**
 * Which member of a superset group is "up next": the first member (in the
 * group's fixed order) whose logged-set count is the group's minimum. When
 * every member is tied, that's the first member — i.e. a fresh round.
 */
export function nextActiveExerciseInGroup(
  exerciseIds: string[],
  completedCountByExerciseId: Map<string, number>,
): string {
  if (exerciseIds.length === 0) {
    throw new Error('nextActiveExerciseInGroup: exerciseIds must not be empty');
  }
  let active = exerciseIds[0];
  let minCount = completedCountByExerciseId.get(active) ?? 0;
  for (const id of exerciseIds) {
    const count = completedCountByExerciseId.get(id) ?? 0;
    if (count < minCount) {
      minCount = count;
      active = id;
    }
  }
  return active;
}

/**
 * Reorders `ids` so every id in `groupMembers` becomes contiguous, inserted
 * at the position of the earliest-occurring member. Members keep their
 * existing relative order from `ids`; everything else keeps its relative
 * order too.
 */
export function reorderForContiguousGroup(ids: string[], groupMembers: string[]): string[] {
  const memberSet = new Set(groupMembers);
  const present = ids.filter((id) => memberSet.has(id));
  if (present.length === 0) return ids;
  const firstIndex = ids.findIndex((id) => memberSet.has(id));
  const others = ids.filter((id) => !memberSet.has(id));
  const insertAt = ids.slice(0, firstIndex).filter((id) => !memberSet.has(id)).length;
  return [...others.slice(0, insertAt), ...present, ...others.slice(insertAt)];
}
