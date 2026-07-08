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

async function addExercise(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(await screen.findByRole('button', { name: /Übung hinzufügen/ }));
  const dialog = await screen.findByRole('dialog', { name: /Übung auswählen/ });
  await user.click(within(dialog).getByRole('button', { name }));
}

describe('active workout: ad-hoc superset round behavior', () => {
  it('advances to the next exercise with no rest, then rests only after the last member', async () => {
    await renderApp();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: /Freies Workout starten/ }));
    await addExercise(user, /^Bankdrücken Langhantel/);
    await addExercise(user, /^Bizepscurls Langhantel/);

    // Group the two ad-hoc exercises into a superset.
    await user.click(await screen.findByRole('button', { name: /Gruppieren/ }));
    const groupDialog = await screen.findByRole('dialog', { name: /Übungen gruppieren/ });
    await user.click(await within(groupDialog).findByRole('checkbox', { name: /Bankdrücken Langhantel/ }));
    await user.click(await within(groupDialog).findByRole('checkbox', { name: /Bizepscurls Langhantel/ }));
    await user.click(within(groupDialog).getByRole('button', { name: /Gruppieren \(2\)/ }));

    expect(await screen.findByText('Superset (2 Übungen)')).toBeInTheDocument();

    const benchSection = (await screen.findByRole('heading', { name: /Bankdrücken Langhantel/ })).closest(
      'section',
    )!;
    const curlSection = (await screen.findByRole('heading', { name: /Bizepscurls Langhantel/ })).closest(
      'section',
    )!;

    // Only the first member's draft is open initially.
    expect(within(benchSection).getByLabelText(/Gewicht für Satz 1/)).toBeInTheDocument();
    expect(within(curlSection).queryByLabelText(/Gewicht für Satz 1/)).not.toBeInTheDocument();

    // Complete exercise A's set — no rest yet, exercise B becomes active instead.
    await user.type(within(benchSection).getByLabelText(/Gewicht für Satz 1/), '60');
    await user.type(within(benchSection).getByLabelText(/Wiederholungen für Satz 1/), '8');
    await user.click(within(benchSection).getByRole('button', { name: /Satz abschließen/ }));

    await waitFor(() => {
      expect(within(curlSection).getByLabelText(/Gewicht für Satz 1/)).toBeInTheDocument();
    });
    expect(screen.queryByRole('status', { name: 'Satzpause' })).not.toBeInTheDocument();

    // Complete exercise B's set — the shared rest timer starts, and the round
    // cycles back to exercise A for set #2.
    await user.type(within(curlSection).getByLabelText(/Gewicht für Satz 1/), '15');
    await user.type(within(curlSection).getByLabelText(/Wiederholungen für Satz 1/), '12');
    await user.click(within(curlSection).getByRole('button', { name: /Satz abschließen/ }));

    await waitFor(() => {
      expect(screen.getByRole('status', { name: 'Satzpause' })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(within(benchSection).getByLabelText(/Gewicht für Satz 2/)).toBeInTheDocument();
    });

    const stored = await db.sets.toArray();
    expect(stored).toHaveLength(2);
  });
});
