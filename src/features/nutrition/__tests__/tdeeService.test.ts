import { describe, expect, it } from 'vitest';
import {
  acceptTdeeAdjustment,
  attachTdeeExplanation,
  enableAdaptiveTdee,
  maybeRecalcTdee,
  rejectTdeeAdjustment,
  setAdaptiveTdeeEnabled,
} from '../tdeeService';
import { logFood, saveFood } from '../nutritionLib';
import { saveBodyMetric } from '../../body/bodyLib';
import { db, ensureSettings } from '../../../db/database';

const DAY = 86_400_000;
const NOW = new Date(2026, 5, 1, 18).getTime();

/** Weight drops 1kg over a perfectly linear 14-day window; 10 of those days log 2200 kcal. */
async function seedCleanTdeeData(now: number): Promise<void> {
  await saveBodyMetric({ date: now - 14 * DAY, weightKg: 80 });
  await saveBodyMetric({ date: now - 7 * DAY, weightKg: 79.5 });
  await saveBodyMetric({ date: now, weightKg: 79 });

  const food = await saveFood({ name: 'TDEE-Test-Food', per100g: { kcal: 220, protein: 10, carbs: 20, fat: 5 } });
  for (let i = 0; i <= 9; i++) {
    await logFood({ foodId: food.id, amountG: 1000, mealType: 'lunch', date: now - i * DAY });
  }
}

describe('enableAdaptiveTdee', () => {
  it('turns the feature on and runs an immediate check even with no data yet', async () => {
    await enableAdaptiveTdee();
    const settings = await ensureSettings();
    expect(settings.adaptiveTdeeEnabled).toBe(true);
    expect(settings.lastTdeeRecalcAt).toBeTypeOf('number');
    expect(settings.pendingTdeeAdjustment).toBeUndefined();
    expect(settings.lastTdeeEstimateKcal).toBeUndefined();
  });
});

describe('maybeRecalcTdee', () => {
  it('is a no-op when the feature is disabled', async () => {
    await seedCleanTdeeData(NOW);
    await maybeRecalcTdee(NOW, { force: true });
    const settings = await ensureSettings();
    expect(settings.lastTdeeRecalcAt).toBeUndefined();
    expect(settings.pendingTdeeAdjustment).toBeUndefined();
  });

  it('derives the goal offset on the first successful run without proposing a change', async () => {
    await setAdaptiveTdeeEnabled(true);
    await seedCleanTdeeData(NOW);

    await maybeRecalcTdee(NOW, { force: true });

    const settings = await ensureSettings();
    // avgIntake 2200, slope -1/14 kg/day → estimatedTdee = 2200 + 550 = 2750.
    expect(settings.lastTdeeEstimateKcal).toBe(2750);
    // offset = currentKcal(2500 default) - estimate(2750) = -250.
    expect(settings.tdeeGoalOffsetKcal).toBe(-250);
    // First run always reproduces the current target exactly (delta 0) — no suggestion yet.
    expect(settings.pendingTdeeAdjustment).toBeUndefined();
    expect(settings.lastTdeeRecalcAt).toBe(NOW);
  });

  it('produces a pending suggestion once the fresh estimate diverges from the captured offset', async () => {
    await setAdaptiveTdeeEnabled(true);
    await db.settings.update('singleton', { tdeeGoalOffsetKcal: -400 });
    await seedCleanTdeeData(NOW);

    await maybeRecalcTdee(NOW, { force: true });

    const settings = await ensureSettings();
    expect(settings.tdeeGoalOffsetKcal).toBe(-400); // untouched — only set on the very first run
    expect(settings.pendingTdeeAdjustment).toBeDefined();
    expect(settings.pendingTdeeAdjustment?.proposedKcal).toBe(2350); // round(2750 - 400)
    expect(settings.pendingTdeeAdjustment?.previousKcal).toBe(2500);
    expect(settings.pendingTdeeAdjustment?.estimatedTdeeKcal).toBe(2750);
  });

  it('respects the weekly cadence gate unless forced', async () => {
    await setAdaptiveTdeeEnabled(true);
    await db.settings.update('singleton', { tdeeGoalOffsetKcal: -400 });
    await seedCleanTdeeData(NOW);
    await maybeRecalcTdee(NOW, { force: true });

    await maybeRecalcTdee(NOW + DAY); // 1 day later, not forced — well under the 7-day gate

    const settings = await ensureSettings();
    expect(settings.lastTdeeRecalcAt).toBe(NOW);
  });
});

describe('acceptTdeeAdjustment / rejectTdeeAdjustment / attachTdeeExplanation', () => {
  async function seedPendingSuggestion(): Promise<void> {
    await setAdaptiveTdeeEnabled(true);
    await db.settings.update('singleton', { tdeeGoalOffsetKcal: -400 });
    await seedCleanTdeeData(NOW);
    await maybeRecalcTdee(NOW, { force: true });
  }

  it('accept writes the proposed targets into dailyTargets and clears the suggestion', async () => {
    await seedPendingSuggestion();
    await acceptTdeeAdjustment();
    const settings = await ensureSettings();
    expect(settings.dailyTargets.kcal).toBe(2350);
    expect(settings.dailyTargets.proteinG).toBe(180); // unchanged — protein stays fixed
    expect(settings.dailyTargets.waterMl).toBe(3000); // unchanged
    expect(settings.pendingTdeeAdjustment).toBeUndefined();
  });

  it('reject clears the suggestion without touching dailyTargets', async () => {
    await seedPendingSuggestion();
    await rejectTdeeAdjustment();
    const settings = await ensureSettings();
    expect(settings.dailyTargets.kcal).toBe(2500); // still the original default
    expect(settings.pendingTdeeAdjustment).toBeUndefined();
  });

  it('attachTdeeExplanation stores the explanation on the pending suggestion without altering its other fields', async () => {
    await seedPendingSuggestion();
    await attachTdeeExplanation('Dein Gewicht sinkt langsamer, daher ein leicht höheres Ziel.');
    const settings = await ensureSettings();
    expect(settings.pendingTdeeAdjustment?.explanation).toBe(
      'Dein Gewicht sinkt langsamer, daher ein leicht höheres Ziel.',
    );
    expect(settings.pendingTdeeAdjustment?.proposedKcal).toBe(2350);
  });

  it('accept/reject/attachTdeeExplanation are no-ops when there is no pending suggestion', async () => {
    await ensureSettings();
    await expect(acceptTdeeAdjustment()).resolves.toBeUndefined();
    await expect(rejectTdeeAdjustment()).resolves.toBeUndefined();
    await expect(attachTdeeExplanation('x')).resolves.toBeUndefined();
    const settings = await ensureSettings();
    expect(settings.dailyTargets.kcal).toBe(2500);
    expect(settings.pendingTdeeAdjustment).toBeUndefined();
  });
});
