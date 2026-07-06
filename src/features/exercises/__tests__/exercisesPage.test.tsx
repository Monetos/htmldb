import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ExercisesPage } from '../ExercisesPage';
import { db } from '../../../db/database';
import type { Exercise } from '../../../db/schema';

const bench: Exercise = {
  id: 'ex-bench',
  name: 'Bankdrücken Langhantel',
  category: 'compound',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  equipment: 'barbell',
  execution: { setup: '.', movement: '.', cues: ['a'], commonMistakes: ['x'] },
  defaultRestSeconds: 180,
  isCustom: false,
  createdAt: 0,
};

const curl: Exercise = { ...bench, id: 'ex-curl', name: 'Bizepscurls Langhantel', primaryMuscles: ['biceps'] };

async function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/uebungen']}>
      <ExercisesPage />
    </MemoryRouter>,
  );
}

describe('ExercisesPage favorites', () => {
  it('toggles a star and filters the list to only favorites', async () => {
    await db.exercises.bulkAdd([bench, curl]);
    await renderPage();
    const user = userEvent.setup();

    await screen.findByText('Bankdrücken Langhantel');
    await user.click(screen.getByRole('button', { name: /Als Favorit markieren: Bankdrücken Langhantel/ }));

    await waitFor(async () => {
      const stored = await db.exercises.get(bench.id);
      expect(stored?.isFavorite).toBe(true);
    });

    await user.click(screen.getByRole('checkbox', { name: 'Nur Favoriten' }));

    await waitFor(() => {
      expect(screen.getByText('Bankdrücken Langhantel')).toBeInTheDocument();
      expect(screen.queryByText('Bizepscurls Langhantel')).not.toBeInTheDocument();
    });
  });
});
