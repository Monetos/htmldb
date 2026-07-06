import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../App';
import { db, seedExercisesIfEmpty } from '../../../db/database';

async function renderApp() {
  await seedExercisesIfEmpty();
  return render(
    <MemoryRouter initialEntries={['/training']}>
      <App />
    </MemoryRouter>,
  );
}

async function finishActiveWorkout(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /Beenden/ }));
  const finishDialog = await screen.findByRole('dialog', { name: /Workout beenden/ });
  await user.click(within(finishDialog).getByRole('button', { name: /Beenden & speichern/ }));
}

function burstElements() {
  return document.querySelectorAll('.rounded-full[style]');
}

describe('workout summary: PR celebration', () => {
  it('shows the summary with a PR card and celebration, then "Fertig" lands on the Dashboard', async () => {
    await renderApp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Freies Workout starten/ }));
    await user.click(await screen.findByRole('button', { name: /Übung hinzufügen/ }));
    const dialog = await screen.findByRole('dialog', { name: /Übung auswählen/ });
    await user.click(within(dialog).getByRole('button', { name: /^Bankdrücken Langhantel/ }));

    await user.type(await screen.findByLabelText(/Gewicht für Satz 1/), '100');
    await user.type(screen.getByLabelText(/Wiederholungen für Satz 1/), '5');
    await user.click(screen.getByRole('button', { name: /Satz abschließen/ }));

    await finishActiveWorkout(user);

    expect(await screen.findByRole('heading', { name: 'Zusammenfassung' })).toBeInTheDocument();
    expect(await screen.findByText('Neue Rekorde')).toBeInTheDocument();
    expect(screen.getByText('Bankdrücken Langhantel')).toBeInTheDocument();
    await waitFor(() => {
      expect(burstElements().length).toBeGreaterThan(0);
    });

    await user.click(screen.getByRole('button', { name: 'Fertig' }));
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });
});

describe('workout summary: streak celebration without a PR', () => {
  it('fires a celebration for a new streak day even when no PR is broken', async () => {
    await seedExercisesIfEmpty();
    const bench = (await db.exercises.where('name').equals('Bankdrücken Langhantel').first())!;
    const day = 24 * 60 * 60 * 1000;
    const yesterdayStart = Date.now() - day;
    await db.workouts.add({
      id: 'w-yesterday',
      date: yesterdayStart,
      startedAt: yesterdayStart,
      finishedAt: yesterdayStart + 1000,
    });
    await db.sets.add({
      id: 's-yesterday',
      workoutId: 'w-yesterday',
      exerciseId: bench.id,
      setNumber: 1,
      weightKg: 100,
      reps: 5,
      isWarmup: false,
      completedAt: yesterdayStart + 500,
    });

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/training']}>
        <App />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: /Freies Workout starten/ }));
    await user.click(await screen.findByRole('button', { name: /Übung hinzufügen/ }));
    const dialog = await screen.findByRole('dialog', { name: /Übung auswählen/ });
    // This exercise was trained yesterday, so it now also appears as a
    // "Zuletzt verwendet" chip whose accessible name is the bare exercise
    // name — use an exact match to disambiguate from the main list button
    // (whose name also includes the equipment/muscle badges).
    await user.click(within(dialog).getByRole('button', { name: 'Bankdrücken Langhantel' }));

    // Lighter than yesterday's set — must not break any PR category.
    await user.type(await screen.findByLabelText(/Gewicht für Satz 1/), '60');
    await user.type(screen.getByLabelText(/Wiederholungen für Satz 1/), '5');
    await user.click(screen.getByRole('button', { name: /Satz abschließen/ }));

    await finishActiveWorkout(user);

    expect(await screen.findByRole('heading', { name: 'Zusammenfassung' })).toBeInTheDocument();
    expect(screen.queryByText('Neue Rekorde')).not.toBeInTheDocument();
    expect(screen.getByText('2 Tage')).toBeInTheDocument();
    await waitFor(() => {
      expect(burstElements().length).toBeGreaterThan(0);
    });
  });
});
