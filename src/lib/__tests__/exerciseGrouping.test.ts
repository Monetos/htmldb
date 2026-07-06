import { describe, expect, it } from 'vitest';
import {
  groupOrderedIds,
  nextActiveExerciseInGroup,
  reorderForContiguousGroup,
  toContiguousBlocks,
} from '../exerciseGrouping';

describe('groupOrderedIds', () => {
  it('leaves ungrouped ids as single items', () => {
    const map = new Map<string, string | undefined>();
    expect(groupOrderedIds(['a', 'b'], map)).toEqual([
      { type: 'single', exerciseId: 'a' },
      { type: 'single', exerciseId: 'b' },
    ]);
  });

  it('collapses ids sharing a groupId into one group item at the earliest position', () => {
    const map = new Map<string, string | undefined>([
      ['a', 'g1'],
      ['b', 'g1'],
      ['c', undefined],
    ]);
    expect(groupOrderedIds(['a', 'b', 'c'], map)).toEqual([
      { type: 'group', groupId: 'g1', exerciseIds: ['a', 'b'] },
      { type: 'single', exerciseId: 'c' },
    ]);
  });

  it('supports multiple separate groups', () => {
    const map = new Map<string, string | undefined>([
      ['a', 'g1'],
      ['b', 'g1'],
      ['c', 'g2'],
      ['d', 'g2'],
    ]);
    expect(groupOrderedIds(['a', 'b', 'c', 'd'], map)).toEqual([
      { type: 'group', groupId: 'g1', exerciseIds: ['a', 'b'] },
      { type: 'group', groupId: 'g2', exerciseIds: ['c', 'd'] },
    ]);
  });
});

interface GroupableItem {
  id: string;
  groupId?: string;
}

describe('toContiguousBlocks', () => {
  it('splits a flat list into single-item blocks when nothing is grouped', () => {
    const list: GroupableItem[] = [{ id: 'a' }, { id: 'b' }];
    expect(toContiguousBlocks(list)).toEqual([[{ id: 'a' }], [{ id: 'b' }]]);
  });

  it('merges adjacent items sharing the same groupId into one block', () => {
    const list: GroupableItem[] = [
      { id: 'a', groupId: 'g1' },
      { id: 'b', groupId: 'g1' },
      { id: 'c' },
    ];
    expect(toContiguousBlocks(list)).toEqual([
      [
        { id: 'a', groupId: 'g1' },
        { id: 'b', groupId: 'g1' },
      ],
      [{ id: 'c' }],
    ]);
  });

  it('treats non-adjacent items with the same groupId as separate blocks', () => {
    const list: GroupableItem[] = [
      { id: 'a', groupId: 'g1' },
      { id: 'b' },
      { id: 'c', groupId: 'g1' },
    ];
    expect(toContiguousBlocks(list)).toEqual([
      [{ id: 'a', groupId: 'g1' }],
      [{ id: 'b' }],
      [{ id: 'c', groupId: 'g1' }],
    ]);
  });
});

describe('nextActiveExerciseInGroup', () => {
  it('returns the first member when all counts are tied (fresh round)', () => {
    const counts = new Map([
      ['a', 1],
      ['b', 1],
    ]);
    expect(nextActiveExerciseInGroup(['a', 'b'], counts)).toBe('a');
  });

  it('returns the member with the fewest completed sets', () => {
    const counts = new Map([
      ['a', 2],
      ['b', 1],
    ]);
    expect(nextActiveExerciseInGroup(['a', 'b'], counts)).toBe('b');
  });

  it('treats missing entries as zero', () => {
    const counts = new Map([['a', 1]]);
    expect(nextActiveExerciseInGroup(['a', 'b'], counts)).toBe('b');
  });

  it('throws on an empty group', () => {
    expect(() => nextActiveExerciseInGroup([], new Map())).toThrow();
  });
});

describe('reorderForContiguousGroup', () => {
  it('returns the input unchanged when no member is present', () => {
    expect(reorderForContiguousGroup(['x', 'y'], ['a', 'b'])).toEqual(['x', 'y']);
  });

  it('groups members already at the front', () => {
    expect(reorderForContiguousGroup(['a', 'x', 'b', 'y'], ['a', 'b'])).toEqual([
      'a',
      'b',
      'x',
      'y',
    ]);
  });

  it('inserts the contiguous block at the position of the first member, preserving others', () => {
    expect(reorderForContiguousGroup(['x', 'a', 'y', 'b', 'z'], ['a', 'b'])).toEqual([
      'x',
      'a',
      'b',
      'y',
      'z',
    ]);
  });

  it('preserves members\' own relative order from ids, not the groupMembers argument order', () => {
    expect(reorderForContiguousGroup(['x', 'b', 'y', 'a', 'z'], ['a', 'b'])).toEqual([
      'x',
      'b',
      'a',
      'y',
      'z',
    ]);
  });
});
