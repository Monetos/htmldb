import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../App';
import { db, seedExercisesIfEmpty } from '../../../db/database';
import { saveRoutine } from '../routinesLib';

async function setup(initialEntries: string[] = ['/training']) {
  await seedExercisesIfEmpty();
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

describe('routine workout flow', () => {
  it('starts a routine from its detail page and pre-populates the exercises in order', async () => {
    await setup();
    const bench = (await db.exercises.where('name').equals('Bankdrücken Langhantel').first())!;
    const row = (await db.exercises.where('name').equals('Rudern mit Langhantel (vorgebeugt)').first())!;

    await saveRoutine({
      name: 'Push/Pull',
      exercises: [
        {
          exerciseId: row.id,
          order: 0,
          targetSets: 3,
          targetRepsMin: 6,
          targetRepsMax: 10,
          targetRestSeconds: 120,
        },
        {
          exerciseId: bench.id,
          order: 1,
          targetSets: 4,
          targetRepsMin: 6,
          targetRepsMax: 10,
          targetRestSeconds: 180,
        },
      ],
    });

    const user = userEvent.setup();
    // Navigate via routines list embedded in the Training empty state.
    const routineLink = await screen.findByRole('link', { name: /Push\/Pull/ });
    await user.click(routineLink);

    // Routine detail loads; click Start.
    await user.click(await screen.findByRole('button', { name: /Starten/ }));

    // Active workout shows the routine name in the header area.
    expect(await screen.findByText('Push/Pull')).toBeInTheDocument();

    // Both exercises appear, in the routine order: Rudern first, then Bankdrücken.
    const rowBlock = await screen.findByRole('region', {
      name: /Rudern mit Langhantel/,
    });
    const benchBlock = await screen.findByRole('region', {
      name: /Bankdrücken Langhantel/,
    });
    expect(rowBlock.compareDocumentPosition(benchBlock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows "Satz X von Y" and "Letzter Satz!" hints from the routine targets', async () => {
    await setup();
    const bench = (await db.exercises.where('name').equals('Bankdrücken Langhantel').first())!;

    await saveRoutine({
      name: 'Mini',
      exercises: [
        {
          exerciseId: bench.id,
          order: 0,
          targetSets: 2,
          targetRepsMin: 6,
          targetRepsMax: 10,
          targetRestSeconds: 180,
        },
      ],
    });

    const user = userEvent.setup();
    await user.click(await screen.findByRole('link', { name: /Mini/ }));
    await user.click(await screen.findByRole('button', { name: /Starten/ }));

    const block = await screen.findByRole('region', { name: /Bankdrücken Langhantel/ });

    // First draft shows "Satz 1 von 2"
    expect(await within(block).findByText(/Satz 1 von 2/)).toBeInTheDocument();

    // Reps input is pre-filled with targetRepsMax (10).
    const repsInput = within(block).getByLabelText(/Wiederholungen für Satz 1/) as HTMLInputElement;
    expect(repsInput.value).toBe('10');

    // Fill weight, complete set, then open the next draft.
    await user.type(within(block).getByLabelText(/Gewicht für Satz 1/), '60');
    await user.click(within(block).getByRole('button', { name: /Satz abschließen/ }));

    // Set 2 is the last target set → "Letzter Satz!" hint must show.
    await user.click(await within(block).findByRole('button', { name: /Satz hinzufügen/ }));
    expect(await within(block).findByText(/Letzter Satz!/)).toBeInTheDocument();
  });
});
