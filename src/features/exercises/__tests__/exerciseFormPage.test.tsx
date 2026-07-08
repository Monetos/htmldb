import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ExerciseFormPage } from '../ExerciseFormPage';
import { db } from '../../../db/database';
import type { Exercise } from '../../../db/schema';

function renderForm(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/uebungen/neu" element={<ExerciseFormPage />} />
        <Route path="/uebungen/:id/bearbeiten" element={<ExerciseFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ExerciseFormPage movement-pattern field', () => {
  it('creates a custom exercise with the chosen movement pattern', async () => {
    renderForm('/uebungen/neu');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Name'), 'Meine Übung');
    await user.click(screen.getAllByText('Brust', { selector: 'button' })[0]);
    await user.selectOptions(screen.getByLabelText(/Bewegungsmuster/), 'Kniebeuge');
    await user.click(screen.getByRole('button', { name: 'Anlegen' }));

    const created = await db.exercises.where('name').equals('Meine Übung').first();
    expect(created?.movementPattern).toBe('squat');
    expect(created?.isCustom).toBe(true);
  });

  it('creates a custom exercise with no movement pattern when "Kein Muster" is left selected', async () => {
    renderForm('/uebungen/neu');
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Name'), 'Übung ohne Muster');
    await user.click(screen.getAllByText('Brust', { selector: 'button' })[0]);
    await user.click(screen.getByRole('button', { name: 'Anlegen' }));

    const created = await db.exercises.where('name').equals('Übung ohne Muster').first();
    expect(created?.movementPattern).toBeUndefined();
  });

  it('round-trips an existing pattern in edit mode and can clear it back to "Kein Muster"', async () => {
    const existing: Exercise = {
      id: 'custom-squat',
      name: 'Vorhandene Übung',
      category: 'compound',
      primaryMuscles: ['quads'],
      secondaryMuscles: [],
      equipment: 'barbell',
      execution: { setup: 'a', movement: 'b', cues: ['c', 'd'], commonMistakes: ['e'] },
      defaultRestSeconds: 120,
      isCustom: true,
      createdAt: 0,
      movementPattern: 'squat',
    };
    await db.exercises.add(existing);

    renderForm(`/uebungen/${existing.id}/bearbeiten`);
    const user = userEvent.setup();

    const select = (await screen.findByLabelText(/Bewegungsmuster/)) as HTMLSelectElement;
    expect(select.value).toBe('squat');

    await user.selectOptions(select, 'Kein Muster');
    await user.click(screen.getByRole('button', { name: 'Speichern' }));

    const reloaded = await db.exercises.get(existing.id);
    expect(reloaded?.movementPattern).toBeUndefined();
  });
});
