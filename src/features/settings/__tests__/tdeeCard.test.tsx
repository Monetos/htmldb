import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../SettingsPage';
import { db } from '../../../db/database';
import { logFood, saveFood } from '../../nutrition/nutritionLib';
import { saveBodyMetric } from '../../body/bodyLib';
import { maybeRecalcTdee, setAdaptiveTdeeEnabled } from '../../nutrition/tdeeService';

async function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/einstellungen']}>
      <SettingsPage />
    </MemoryRouter>,
  );
}

const DAY = 86_400_000;
const NOW = new Date(2026, 5, 1, 18).getTime();

describe('TdeeCard', () => {
  it('is off by default', async () => {
    await renderSettings();
    const toggle = await screen.findByRole('switch', { name: 'Adaptives Kalorienziel aktivieren' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('turning the toggle on persists adaptiveTdeeEnabled and shows an insufficient-data message with no data', async () => {
    await renderSettings();
    const user = userEvent.setup();
    const toggle = await screen.findByRole('switch', { name: 'Adaptives Kalorienziel aktivieren' });
    await user.click(toggle);

    await waitFor(async () => {
      const settings = await db.settings.get('singleton');
      expect(settings?.adaptiveTdeeEnabled).toBe(true);
    });
    expect(await screen.findByText(/Noch nicht genug Daten/)).toBeInTheDocument();
  });

  it('shows a pending suggestion with a working accept action once the estimate diverges', async () => {
    await setAdaptiveTdeeEnabled(true);
    await db.settings.update('singleton', { tdeeGoalOffsetKcal: -400 });
    await saveBodyMetric({ date: NOW - 14 * DAY, weightKg: 80 });
    await saveBodyMetric({ date: NOW - 7 * DAY, weightKg: 79.5 });
    await saveBodyMetric({ date: NOW, weightKg: 79 });
    const food = await saveFood({
      name: 'TDEE-Card-Food',
      per100g: { kcal: 220, protein: 10, carbs: 20, fat: 5 },
    });
    for (let i = 0; i <= 9; i++) {
      await logFood({ foodId: food.id, amountG: 1000, mealType: 'lunch', date: NOW - i * DAY });
    }
    await maybeRecalcTdee(NOW, { force: true });

    await renderSettings();
    expect(await screen.findByText(/2500 kcal → 2350 kcal/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Übernehmen' }));

    await waitFor(async () => {
      const settings = await db.settings.get('singleton');
      expect(settings?.dailyTargets.kcal).toBe(2350);
      expect(settings?.pendingTdeeAdjustment).toBeUndefined();
    });
  });

  it('reject clears the suggestion without changing dailyTargets', async () => {
    await setAdaptiveTdeeEnabled(true);
    await db.settings.update('singleton', { tdeeGoalOffsetKcal: -400 });
    await saveBodyMetric({ date: NOW - 14 * DAY, weightKg: 80 });
    await saveBodyMetric({ date: NOW - 7 * DAY, weightKg: 79.5 });
    await saveBodyMetric({ date: NOW, weightKg: 79 });
    const food = await saveFood({
      name: 'TDEE-Card-Food-2',
      per100g: { kcal: 220, protein: 10, carbs: 20, fat: 5 },
    });
    for (let i = 0; i <= 9; i++) {
      await logFood({ foodId: food.id, amountG: 1000, mealType: 'lunch', date: NOW - i * DAY });
    }
    await maybeRecalcTdee(NOW, { force: true });

    await renderSettings();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Verwerfen' }));

    await waitFor(async () => {
      const settings = await db.settings.get('singleton');
      expect(settings?.pendingTdeeAdjustment).toBeUndefined();
      expect(settings?.dailyTargets.kcal).toBe(2500);
    });
  });
});
