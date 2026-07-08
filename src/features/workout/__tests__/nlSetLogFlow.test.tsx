import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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

describe('natural-language set logging: no-API-key gating', () => {
  it('page-level "Per Text protokollieren" shows the amber gate with a link to settings when no key is configured', async () => {
    await renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Freies Workout starten/ }));

    await user.click(await screen.findByRole('button', { name: /Per Text protokollieren/ }));
    const dialog = await screen.findByRole('dialog', { name: /Per Text protokollieren/ });
    expect(
      within(dialog).getByText(/Für die Text-Protokollierung brauchst du einen Anthropic-API-Key/),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /In den Einstellungen hinterlegen/ })).toHaveAttribute(
      'href',
      '/einstellungen',
    );
  });

  it('exercise-scoped quick entry shows the same amber gate when no key is configured', async () => {
    await renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Freies Workout starten/ }));

    await user.click(await screen.findByRole('button', { name: /Übung hinzufügen/ }));
    const picker = await screen.findByRole('dialog', { name: /Übung auswählen/ });
    await user.click(await within(picker).findByRole('button', { name: /^Bankdrücken Langhantel/ }));

    const exerciseSection = (
      await screen.findByRole('heading', { name: /Bankdrücken Langhantel/ })
    ).closest('section')!;
    await user.click(within(exerciseSection).getByRole('button', { name: 'Per Text protokollieren' }));
    const dialog = await screen.findByRole('dialog', { name: /Per Text protokollieren/ });
    expect(
      within(dialog).getByText(/Für die Text-Protokollierung brauchst du einen Anthropic-API-Key/),
    ).toBeInTheDocument();
  });

  it('does not write anything to db.sets while the gate is showing', async () => {
    await renderApp();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Freies Workout starten/ }));
    await user.click(await screen.findByRole('button', { name: /Per Text protokollieren/ }));
    await screen.findByRole('dialog', { name: /Per Text protokollieren/ });
    expect(await db.sets.toArray()).toHaveLength(0);
  });
});
