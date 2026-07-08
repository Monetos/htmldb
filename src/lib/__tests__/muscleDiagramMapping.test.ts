import { describe, expect, it } from 'vitest';
import type { AmpelStatus } from '../progression';
import {
  combineAmpelStatuses,
  hasAnyRegionForView,
  regionMembershipForView,
  regionStatusesForView,
} from '../muscleDiagramMapping';

describe('combineAmpelStatuses', () => {
  it('prefers below over in_range', () => {
    expect(combineAmpelStatuses(['in_range', 'below'])).toBe('below');
  });

  it('prefers above over in_range', () => {
    expect(combineAmpelStatuses(['above', 'in_range'])).toBe('above');
  });

  it('prefers below over above', () => {
    expect(combineAmpelStatuses(['above', 'below'])).toBe('below');
  });

  it('falls back to no_baseline for an empty list', () => {
    expect(combineAmpelStatuses([])).toBe('no_baseline');
  });

  it('returns no_baseline unchanged', () => {
    expect(combineAmpelStatuses(['no_baseline'])).toBe('no_baseline');
  });
});

describe('regionStatusesForView', () => {
  it('combines back_lats and back_rhomboids into upper-back using the worst status', () => {
    const ampel: { muscle: 'back_lats' | 'back_rhomboids'; status: AmpelStatus }[] = [
      { muscle: 'back_lats', status: 'below' },
      { muscle: 'back_rhomboids', status: 'in_range' },
    ];
    expect(regionStatusesForView(ampel, 'back')['upper-back']).toBe('below');
  });

  it('combines shoulders_front and shoulders_side into front deltoids using the worst status', () => {
    const ampel: { muscle: 'shoulders_front' | 'shoulders_side'; status: AmpelStatus }[] = [
      { muscle: 'shoulders_front', status: 'above' },
      { muscle: 'shoulders_side', status: 'in_range' },
    ];
    expect(regionStatusesForView(ampel, 'front').deltoids).toBe('above');
  });

  it('lights up triceps independently on the front and back view', () => {
    const ampel: { muscle: 'triceps'; status: AmpelStatus }[] = [
      { muscle: 'triceps', status: 'below' },
    ];
    expect(regionStatusesForView(ampel, 'front').triceps).toBe('below');
    expect(regionStatusesForView(ampel, 'back').triceps).toBe('below');
  });

  it('omits a region on a view the muscle has no mapping for', () => {
    const ampel: { muscle: 'glutes'; status: AmpelStatus }[] = [
      { muscle: 'glutes', status: 'below' },
    ];
    expect(regionStatusesForView(ampel, 'front').gluteal).toBeUndefined();
  });
});

describe('regionMembershipForView', () => {
  it('marks primary and secondary muscles with distinct levels', () => {
    const membership = regionMembershipForView(['chest'], ['shoulders_front'], 'front');
    expect(membership.chest).toBe('primary');
    expect(membership.deltoids).toBe('secondary');
  });

  it('resolves a collision in favor of primary', () => {
    const membership = regionMembershipForView(['chest'], ['chest'], 'front');
    expect(membership.chest).toBe('primary');
  });
});

describe('hasAnyRegionForView', () => {
  it('is true when a muscle maps to the given view', () => {
    expect(hasAnyRegionForView(['chest'], 'front')).toBe(true);
  });

  it('is false when no muscle maps to the given view', () => {
    expect(hasAnyRegionForView(['chest'], 'back')).toBe(false);
    expect(hasAnyRegionForView(['back_lats'], 'front')).toBe(false);
  });
});
