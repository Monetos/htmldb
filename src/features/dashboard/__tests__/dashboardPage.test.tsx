import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../App';
import { db, seedExercisesIfEmpty, seedFoodsIfEmpty } from '../../../db/database';

async function renderDashboard() {
  await seedExercisesIfEmpty();
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  it('shows the streak tile reflecting finished workouts', async () => {
    const now = Date.now();
    await db.workouts.add({ id: 'w1', date: now, startedAt: now, finishedAt: now + 1000 });
    await renderDashboard();

    expect(await screen.findByText('1 Tag')).toBeInTheDocument();
  });

  it('shows this week\'s workout count and last-trained date', async () => {
    const now = Date.now();
    await db.workouts.add({ id: 'w1', date: now, startedAt: now, finishedAt: now + 1000 });
    await renderDashboard();

    await screen.findByText('Diese Woche');
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(new Date(now).toLocaleDateString('de-DE'))).toBeInTheDocument();
    });
  });

  it('shows the weight-trend delta between two body metrics', async () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    await db.bodyMetrics.bulkAdd([
      { id: 'm1', date: now - 40 * day, weightKg: 85 },
      { id: 'm2', date: now, weightKg: 80 },
    ]);
    await renderDashboard();

    expect(await screen.findByText('80 kg')).toBeInTheDocument();
    expect(screen.getByText(/-5 kg \(30 Tage\)/)).toBeInTheDocument();
  });

  it('shows no comparison message when only one body metric exists', async () => {
    await db.bodyMetrics.add({ id: 'm1', date: Date.now(), weightKg: 80 });
    await renderDashboard();

    expect(await screen.findByText('80 kg')).toBeInTheDocument();
    expect(screen.getByText('Kein Vergleichswert')).toBeInTheDocument();
  });

  it("shows today's nutrition totals via MacroRings", async () => {
    await seedFoodsIfEmpty();
    const food = await db.foods.toArray().then((rows) => rows[0]);
    await db.foodLog.add({
      id: 'f1',
      date: new Date(new Date().setHours(0, 0, 0, 0)).getTime(),
      foodId: food.id,
      amountG: 100,
      mealType: 'lunch',
      loggedAt: Date.now(),
    });
    await renderDashboard();

    const expectedKcal = Math.round(food.per100g.kcal);
    expect(
      await screen.findByRole('img', { name: new RegExp(`^kcal ${expectedKcal} von`) }),
    ).toBeInTheDocument();
  });

  it('starts a free workout and navigates to Training when no workout is active', async () => {
    await renderDashboard();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Freies Workout starten' }));

    await waitFor(async () => {
      expect(await db.workouts.count()).toBe(1);
    });
    expect(await screen.findByRole('button', { name: /Übung hinzufügen/ })).toBeInTheDocument();
  });

  it('resumes an active workout without creating a duplicate', async () => {
    const now = Date.now();
    await db.workouts.add({ id: 'w-active', date: now, startedAt: now });
    await renderDashboard();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Fortsetzen' }));

    expect(await screen.findByRole('button', { name: /Übung hinzufügen/ })).toBeInTheDocument();
    expect(await db.workouts.count()).toBe(1);
  });
});
