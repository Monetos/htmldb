import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ExerciseDetailPage } from '../ExerciseDetailPage';
import { db } from '../../../db/database';
import type { Exercise } from '../../../db/schema';

const withVideo: Exercise = {
  id: 'ex-video',
  name: 'Bankdrücken Langhantel',
  category: 'compound',
  primaryMuscles: ['chest'],
  secondaryMuscles: [],
  equipment: 'barbell',
  execution: { setup: 'a', movement: 'b', cues: ['c', 'd'], commonMistakes: ['e'] },
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  defaultRestSeconds: 180,
  isCustom: false,
  createdAt: 0,
};

const withoutVideo: Exercise = { ...withVideo, id: 'ex-novideo', videoUrl: undefined };

async function renderDetail(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/uebungen/${id}`]}>
      <Routes>
        <Route path="/uebungen/:id" element={<ExerciseDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ExerciseDetailPage video card', () => {
  it('shows nothing when the exercise has no videoUrl', async () => {
    await db.exercises.add(withoutVideo);
    await renderDetail(withoutVideo.id);

    await screen.findByText('Bankdrücken Langhantel');
    expect(screen.queryByText('Video')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Video laden/ })).not.toBeInTheDocument();
  });

  it('shows a tap-to-load placeholder and only embeds an iframe after clicking', async () => {
    await db.exercises.add(withVideo);
    await renderDetail(withVideo.id);
    const user = userEvent.setup();

    const loadButton = await screen.findByRole('button', { name: /Video laden/ });
    expect(screen.queryByTitle(`Video: ${withVideo.name}`)).not.toBeInTheDocument();

    await user.click(loadButton);

    await waitFor(() => {
      expect(screen.getByTitle(`Video: ${withVideo.name}`)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /Video laden/ })).not.toBeInTheDocument();
  });
});
