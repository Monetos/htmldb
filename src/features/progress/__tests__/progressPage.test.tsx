import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../App';
import { seedExercise, seedWorkoutHistory } from '../../../test/fixtures';

// Pin "now" to a known Monday so streak / weekly buckets are deterministic.
const NOW = new Date(2026, 4, 11, 18, 0, 0, 0).getTime(); // Mon 2026-05-11

beforeEach(() => {
  // Faking just Date.now() (not setTimeout/setInterval) avoids freezing the
  // Dexie test-isolation hooks while still pinning week/streak math.
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function renderProgress() {
  return render(
    <MemoryRouter initialEntries={['/statistik']}>
      <App />
    </MemoryRouter>,
  );
}

describe('Statistik page', () => {
  it('renders streak count, PR table and muscle ampel after a few workouts', async () => {
    await seedExercise({ id: 'bench', name: 'Bench', primaryMuscles: ['chest'] });
    await seedWorkoutHistory(
      [
        // 2 days in a row including today
        { daysAgo: 0, exercises: [{ exerciseId: 'bench', sets: [{ weightKg: 80, reps: 5 }] }] },
        { daysAgo: 1, exercises: [{ exerciseId: 'bench', sets: [{ weightKg: 75, reps: 5 }] }] },
      ],
      NOW,
    );

    await renderProgress();

    // Streak banner (counts both finished days incl. today).
    expect(await screen.findByText(/2 Tage/)).toBeInTheDocument();

    // PR table shows the bench row with the heaviest weight.
    expect(await screen.findByText('Bench')).toBeInTheDocument();
    expect((await screen.findAllByText(/80 kg/)).length).toBeGreaterThan(0);

    // Muscle ampel shows Brust as an active row.
    const ampelHeader = await screen.findByText('Diese Woche');
    const ampelSection = ampelHeader.closest('.rounded-2xl') as HTMLElement;
    expect(within(ampelSection).getByText('Brust')).toBeInTheDocument();
  });

  it('shows the empty state for an empty database', async () => {
    await renderProgress();
    // Streak banner is still there but reads 0.
    const streakValue = await screen.findByText(/0 Tage/);
    expect(streakValue).toBeInTheDocument();
    expect(screen.getByText(/Noch keine PRs/)).toBeInTheDocument();
  });
});
