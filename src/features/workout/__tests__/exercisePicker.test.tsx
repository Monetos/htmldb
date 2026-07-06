import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExercisePicker } from '../ExercisePicker';
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

const curl: Exercise = {
  ...bench,
  id: 'ex-curl',
  name: 'Bizepscurls Langhantel',
  primaryMuscles: ['biceps'],
  equipment: 'dumbbell',
};

const legPress: Exercise = {
  ...bench,
  id: 'ex-legpress',
  name: 'Beinpresse',
  primaryMuscles: ['quads'],
  equipment: 'machine',
};

async function renderPicker(onPick = vi.fn()) {
  render(
    <ExercisePicker open excludeExerciseIds={[]} onClose={() => {}} onPick={onPick} />,
  );
  return onPick;
}

describe('ExercisePicker', () => {
  it('shows a Favoriten section only for starred exercises', async () => {
    await db.exercises.bulkAdd([bench, { ...curl, isFavorite: true }, legPress]);
    await renderPicker();

    expect(await screen.findByText('Favoriten')).toBeInTheDocument();
    expect(screen.queryByText('Zuletzt verwendet')).not.toBeInTheDocument();
  });

  it('shows a Zuletzt verwendet section for exercises with logged sets', async () => {
    await db.exercises.bulkAdd([bench, curl, legPress]);
    await db.workouts.add({ id: 'w1', date: 0, startedAt: 0 });
    await db.sets.add({
      id: 's1',
      workoutId: 'w1',
      exerciseId: legPress.id,
      setNumber: 1,
      weightKg: 100,
      reps: 10,
      isWarmup: false,
      completedAt: Date.now(),
    });
    await renderPicker();

    expect(await screen.findByText('Zuletzt verwendet')).toBeInTheDocument();
  });

  it('filters the list by muscle group and equipment chips', async () => {
    await db.exercises.bulkAdd([bench, curl, legPress]);
    await renderPicker();
    const user = userEvent.setup();

    await screen.findByText('Bankdrücken Langhantel');
    await user.click(screen.getByRole('button', { name: 'Bizeps' }));

    await waitFor(() => {
      expect(screen.queryByText('Bankdrücken Langhantel')).not.toBeInTheDocument();
      expect(screen.getByText('Bizepscurls Langhantel')).toBeInTheDocument();
    });

    // Clearing the muscle filter and applying an equipment filter instead.
    await user.click(screen.getByRole('button', { name: 'Bizeps' }));
    await user.click(screen.getByRole('button', { name: 'Maschine' }));
    await waitFor(() => {
      expect(screen.getByText('Beinpresse')).toBeInTheDocument();
      expect(screen.queryByText('Bankdrücken Langhantel')).not.toBeInTheDocument();
    });
  });

  it('toggles favorite state via the star button', async () => {
    await db.exercises.bulkAdd([bench]);
    await renderPicker();
    const user = userEvent.setup();

    const star = await screen.findByRole('button', { name: /Als Favorit markieren: Bankdrücken Langhantel/ });
    await user.click(star);

    await waitFor(async () => {
      const stored = await db.exercises.get(bench.id);
      expect(stored?.isFavorite).toBe(true);
    });
  });
});
