import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../App';
import { db, seedExercisesIfEmpty } from '../../../db/database';
import { ROUTINE_TEMPLATES } from '../../../db/routineTemplates';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function setup() {
  await seedExercisesIfEmpty();
  return render(
    <MemoryRouter initialEntries={['/routinen/neu']}>
      <App />
    </MemoryRouter>,
  );
}

describe('routine template flow', () => {
  it('applying a multi-day template creates one routine per day and navigates to the list', async () => {
    await setup();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Vorlage verwenden' }));
    const dialog = await screen.findByRole('dialog', { name: /Vorlage auswählen/ });
    const ppl = ROUTINE_TEMPLATES.find((t) => t.id === 'ppl')!;
    await user.click(within(dialog).getByRole('button', { name: new RegExp(`^${escapeRegExp(ppl.name)}`) }));

    await waitFor(async () => {
      const routines = await db.routines.toArray();
      expect(routines).toHaveLength(ppl.days.length);
    });
    expect(await screen.findByRole('heading', { name: 'Routinen' })).toBeInTheDocument();
  });

  it('applying a two-day template navigates straight to the routine detail page when only one day resolves', async () => {
    await setup();
    const user = userEvent.setup();

    // Delete every exercise the starting-strength template's second day needs,
    // leaving only its first day resolvable.
    const startingStrength = ROUTINE_TEMPLATES.find((t) => t.id === 'starting-strength')!;
    const secondDayNames = new Set(startingStrength.days[1].exercises.map((e) => e.exerciseName));
    const toDelete = await db.exercises.where('name').anyOf([...secondDayNames]).toArray();
    await db.exercises.bulkDelete(toDelete.map((e) => e.id));

    await user.click(await screen.findByRole('button', { name: 'Vorlage verwenden' }));
    const dialog = await screen.findByRole('dialog', { name: /Vorlage auswählen/ });
    await user.click(
      within(dialog).getByRole('button', { name: new RegExp(`^${escapeRegExp(startingStrength.name)}`) }),
    );

    await waitFor(async () => {
      const routines = await db.routines.toArray();
      expect(routines).toHaveLength(1);
      expect(routines[0].name).toBe(startingStrength.days[0].name);
    });
    expect(await screen.findByRole('heading', { name: startingStrength.days[0].name })).toBeInTheDocument();
  });
});
