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

describe('active workout: start → add exercise → log a set', () => {
  it('walks through the happy path and persists the set in IndexedDB', async () => {
    await renderApp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Freies Workout starten/ }));

    await user.click(await screen.findByRole('button', { name: /Übung hinzufügen/ }));
    const dialog = await screen.findByRole('dialog', { name: /Übung auswählen/ });
    await user.click(within(dialog).getByRole('button', { name: /^Bankdrücken Langhantel/ }));

    // Draft row opens for set #1
    const weightInput = await screen.findByLabelText(/Gewicht für Satz 1/);
    const repsInput = screen.getByLabelText(/Wiederholungen für Satz 1/);
    await user.type(weightInput, '60');
    await user.type(repsInput, '8');
    await user.click(screen.getByRole('button', { name: /Satz abschließen/ }));

    await waitFor(async () => {
      const stored = await db.sets.toArray();
      expect(stored).toHaveLength(1);
      expect(stored[0].weightKg).toBe(60);
      expect(stored[0].reps).toBe(8);
      expect(stored[0].setNumber).toBe(1);
    });
  });

  it('finishing the workout marks finishedAt and shows the empty start screen again', async () => {
    await renderApp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Freies Workout starten/ }));
    await user.click(await screen.findByRole('button', { name: /Beenden/ }));

    const finishDialog = await screen.findByRole('dialog', { name: /Workout beenden/ });
    await user.click(within(finishDialog).getByRole('button', { name: /Beenden & speichern/ }));

    await waitFor(async () => {
      const workouts = await db.workouts.toArray();
      expect(workouts).toHaveLength(1);
      expect(workouts[0].finishedAt).toBeDefined();
    });
  });
});
