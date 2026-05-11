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

describe('PR hint during a workout', () => {
  it('shows "Neuer PR!" when the first set of an exercise is logged with positive weight × reps', async () => {
    await renderApp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Freies Workout starten/ }));
    await user.click(await screen.findByRole('button', { name: /Übung hinzufügen/ }));
    const dialog = await screen.findByRole('dialog', { name: /Übung auswählen/ });
    await user.click(within(dialog).getByRole('button', { name: /^Bankdrücken Langhantel/ }));

    await user.type(await screen.findByLabelText(/Gewicht für Satz 1/), '60');
    await user.type(screen.getByLabelText(/Wiederholungen für Satz 1/), '8');
    await user.click(screen.getByRole('button', { name: /Satz abschließen/ }));

    const block = await screen.findByRole('region', { name: /Bankdrücken Langhantel/ });
    await waitFor(() => {
      expect(within(block).getByText('Neuer PR!')).toBeInTheDocument();
    });
    // Sanity: the set is in the DB.
    const sets = await db.sets.toArray();
    expect(sets).toHaveLength(1);
  });
});
