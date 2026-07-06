export interface PlateSet {
  barWeight: number;
  plateOptions: number[]; // largest → smallest
}

/** Standard 20kg Olympic bar + common plate increments. */
export const PLATES_KG: PlateSet = {
  barWeight: 20,
  plateOptions: [25, 20, 15, 10, 5, 2.5, 1.25],
};

/** Standard 45lb bar + common plate increments — real US gym hardware, not a kg-bar relabeling. */
export const PLATES_LB: PlateSet = {
  barWeight: 45,
  plateOptions: [45, 35, 25, 10, 5, 2.5],
};

export interface PlateBreakdown {
  barWeight: number;
  /** One entry per physical plate needed per side, largest → smallest. */
  perSidePlates: number[];
  /** Unachievable leftover per side if the target can't be hit exactly. */
  remainder: number;
}

/**
 * Greedy largest-plate-first per side. `targetWeight` and `plateOptions`
 * must already be in the same unit-space as `barWeight` — callers convert
 * once at the edge (never mix a kg bar with lbs plates or vice versa).
 */
export function calculatePlates(
  targetWeight: number,
  barWeight: number,
  plateOptions: number[],
): PlateBreakdown {
  const perSide = Math.max(0, (targetWeight - barWeight) / 2);
  let remaining = perSide;
  const plates: number[] = [];
  for (const plate of plateOptions) {
    while (remaining + 1e-9 >= plate) {
      plates.push(plate);
      remaining -= plate;
    }
  }
  return { barWeight, perSidePlates: plates, remainder: Math.max(0, remaining) };
}
