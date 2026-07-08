import type { AmpelStatus } from './progression';
import type { MuscleGroup } from '../db/schema';
import type { RegionSlug } from './bodyDiagramData';

export type BodyView = 'front' | 'back';

export const MUSCLE_GROUP_TO_REGIONS: Record<
  MuscleGroup,
  Partial<Record<BodyView, RegionSlug[]>>
> = {
  chest: { front: ['chest'] },
  back_lats: { back: ['upper-back'] },
  back_rhomboids: { back: ['upper-back'] },
  back_traps: { back: ['trapezius'] },
  shoulders_front: { front: ['deltoids'] },
  shoulders_side: { front: ['deltoids'] },
  shoulders_rear: { back: ['deltoids'] },
  biceps: { front: ['biceps'] },
  triceps: { front: ['triceps'], back: ['triceps'] },
  forearms: { front: ['forearm'], back: ['forearm'] },
  quads: { front: ['quadriceps'] },
  hamstrings: { back: ['hamstring'] },
  glutes: { back: ['gluteal'] },
  calves: { front: ['calves'], back: ['calves'] },
  abs: { front: ['abs'] },
  lower_back: { back: ['lower-back'] },
};

const STATUS_PRIORITY: AmpelStatus[] = ['below', 'above', 'in_range', 'no_baseline'];

/** Undertraining outranks overtraining outranks in-range outranks no-data, so the most attention-worthy signal wins when several muscle groups share one region. */
export function combineAmpelStatuses(statuses: AmpelStatus[]): AmpelStatus {
  for (const priority of STATUS_PRIORITY) {
    if (statuses.includes(priority)) return priority;
  }
  return 'no_baseline';
}

export function regionStatusesForView(
  ampel: { muscle: MuscleGroup; status: AmpelStatus }[],
  view: BodyView,
): Partial<Record<RegionSlug, AmpelStatus>> {
  const bySlug = new Map<RegionSlug, AmpelStatus[]>();
  for (const entry of ampel) {
    const slugs = MUSCLE_GROUP_TO_REGIONS[entry.muscle][view] ?? [];
    for (const slug of slugs) {
      bySlug.set(slug, [...(bySlug.get(slug) ?? []), entry.status]);
    }
  }
  const out: Partial<Record<RegionSlug, AmpelStatus>> = {};
  for (const [slug, statuses] of bySlug) {
    out[slug] = combineAmpelStatuses(statuses);
  }
  return out;
}

export type MembershipLevel = 'primary' | 'secondary';

export function regionMembershipForView(
  primaryMuscles: MuscleGroup[],
  secondaryMuscles: MuscleGroup[],
  view: BodyView,
): Partial<Record<RegionSlug, MembershipLevel>> {
  const out: Partial<Record<RegionSlug, MembershipLevel>> = {};
  for (const muscle of secondaryMuscles) {
    for (const slug of MUSCLE_GROUP_TO_REGIONS[muscle][view] ?? []) out[slug] = 'secondary';
  }
  for (const muscle of primaryMuscles) {
    for (const slug of MUSCLE_GROUP_TO_REGIONS[muscle][view] ?? []) out[slug] = 'primary';
  }
  return out;
}

/** True if this muscle list lights up at least one region on `view` — used to pick a sensible default view. */
export function hasAnyRegionForView(muscles: MuscleGroup[], view: BodyView): boolean {
  return muscles.some((muscle) => (MUSCLE_GROUP_TO_REGIONS[muscle][view] ?? []).length > 0);
}
