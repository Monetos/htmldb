import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ExerciseTrendCharts } from '../ExerciseTrendCharts';
import { PlateauSummarySection } from '../PlateauSummarySection';
import { db } from '../../../db/database';
import type { Exercise } from '../../../db/schema';

const DAY = 86_400_000;

const benchExercise: Exercise = {
  id: 'ex-bench',
  name: 'Bankdrücken',
  category: 'compound',
  primaryMuscles: ['chest'],
  secondaryMuscles: ['triceps'],
  equipment: 'barbell',
  execution: { setup: '.', movement: '.', cues: ['a', 'b'], commonMistakes: ['x'] },
  defaultRestSeconds: 180,
  isCustom: false,
  createdAt: 0,
};

let seedCounter = 0;

async function seedWorkoutWithSet(exerciseId: string, startedAt: number, weightKg: number, reps: number) {
  seedCounter += 1;
  const workoutId = `w-${seedCounter}`;
  await db.workouts.add({ id: workoutId, date: startedAt, startedAt });
  await db.sets.add({
    id: `s-${seedCounter}`,
    workoutId,
    exerciseId,
    setNumber: 1,
    weightKg,
    reps,
    isWarmup: false,
    completedAt: startedAt,
  });
}

/** 12 workouts, flat e1RM within the ±2.5% band -> 'plateaued'. */
async function seedPlateauedExercise(exerciseId: string, now: number) {
  for (let i = 0; i < 6; i++) await seedWorkoutWithSet(exerciseId, now - (12 - i) * DAY, 100, 5);
  for (let i = 0; i < 6; i++) await seedWorkoutWithSet(exerciseId, now - (6 - i) * DAY, 101, 5);
}

describe('ExerciseTrendCharts plateau callout', () => {
  it('shows a plateau callout and dismissing it removes it', async () => {
    await db.exercises.add(benchExercise);
    // Real Date.now(), not a fixed epoch offset — ExerciseTrendCharts's chart filters by the
    // actual wall-clock 3-month default range, unlike plateau detection itself which is workout-count-based.
    const now = Date.now();
    await seedPlateauedExercise('ex-bench', now);

    render(
      <MemoryRouter>
        <ExerciseTrendCharts exerciseId="ex-bench" exerciseName="Bankdrücken" />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Deine Kraftwerte stagnieren/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Verwerfen' }));

    await waitFor(() => {
      expect(screen.queryByText(/Deine Kraftwerte stagnieren/)).not.toBeInTheDocument();
    });
  });

  it('shows no callout for an exercise with too little data', async () => {
    await db.exercises.add(benchExercise);
    const now = Date.now();
    await seedWorkoutWithSet('ex-bench', now, 100, 5);

    render(
      <MemoryRouter>
        <ExerciseTrendCharts exerciseId="ex-bench" exerciseName="Bankdrücken" />
      </MemoryRouter>,
    );

    await screen.findByText(/Höchstes Gewicht pro Workout/);
    expect(screen.queryByText(/Deine Kraftwerte/)).not.toBeInTheDocument();
  });
});

describe('PlateauSummarySection', () => {
  it('renders nothing when no exercise qualifies', () => {
    const { container } = render(
      <MemoryRouter>
        <PlateauSummarySection />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists a plateaued exercise and lets it be dismissed', async () => {
    await db.exercises.add(benchExercise);
    const now = 100 * DAY;
    await seedPlateauedExercise('ex-bench', now);

    render(
      <MemoryRouter>
        <PlateauSummarySection />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Bankdrücken')).toBeInTheDocument();
    expect(screen.getByText('Stagniert')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Verwerfen' }));

    await waitFor(() => {
      expect(screen.queryByText('Bankdrücken')).not.toBeInTheDocument();
    });
  });
});
