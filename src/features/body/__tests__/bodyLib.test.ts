import { describe, expect, it } from 'vitest';
import {
  computeResizeTarget,
  deleteBodyMetric,
  saveBodyMetric,
} from '../bodyLib';
import { db } from '../../../db/database';

describe('computeResizeTarget', () => {
  it('returns the original dimensions when both edges are within the limit', () => {
    expect(computeResizeTarget(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('shrinks landscape images so the longer edge matches the limit', () => {
    expect(computeResizeTarget(3200, 2400, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('shrinks portrait images so height becomes the limit', () => {
    expect(computeResizeTarget(2000, 4000, 1600)).toEqual({ width: 800, height: 1600 });
  });

  it('returns zeros for non-positive inputs', () => {
    expect(computeResizeTarget(0, 100, 1600)).toEqual({ width: 0, height: 0 });
    expect(computeResizeTarget(-10, 100, 1600)).toEqual({ width: 0, height: 0 });
  });
});

describe('saveBodyMetric', () => {
  it('creates a new metric with pruned (non-empty) measurements', async () => {
    const row = await saveBodyMetric({
      date: Date.now(),
      weightKg: 80,
      bodyFatPercent: 15.5,
      measurements: { waistCm: 82, hipsCm: undefined },
      notes: '  rest day  ',
    });
    expect(row.weightKg).toBe(80);
    expect(row.bodyFatPercent).toBe(15.5);
    expect(row.measurements).toEqual({ waistCm: 82 });
    expect(row.notes).toBe('rest day');
  });

  it('returns measurements undefined when no fields are populated', async () => {
    const row = await saveBodyMetric({
      date: Date.now(),
      measurements: { waistCm: undefined },
    });
    expect(row.measurements).toBeUndefined();
  });

  it('updates an existing metric in place', async () => {
    const first = await saveBodyMetric({ date: Date.now(), weightKg: 80 });
    const updated = await saveBodyMetric({ id: first.id, date: first.date, weightKg: 81 });
    expect(updated.id).toBe(first.id);
    expect(updated.weightKg).toBe(81);
    expect(await db.bodyMetrics.count()).toBe(1);
  });
});

describe('deleteBodyMetric', () => {
  it('removes the row', async () => {
    const row = await saveBodyMetric({ date: Date.now(), weightKg: 80 });
    await deleteBodyMetric(row.id);
    expect(await db.bodyMetrics.get(row.id)).toBeUndefined();
  });
});

// compressImageBlob is exercised end-to-end in the browser; in jsdom the
// <img> decode never fires, so we only validate the pure resize-math above.
