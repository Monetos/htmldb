import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../App';
import { db } from '../../../db/database';
import { saveBodyMetric, savePhoto } from '../bodyLib';

const NOW = new Date(2026, 4, 11, 12).getTime();

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Körper tab', () => {
  it('shows the empty state with create button on first visit', async () => {
    render(
      <MemoryRouter initialEntries={['/koerper']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/Noch keine Körperdaten/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Neue Messung/ })).toBeInTheDocument();
  });

  it('saves a new metric from the form and shows it in the history list', async () => {
    render(
      <MemoryRouter initialEntries={['/koerper/messung/neu']}>
        <App />
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Gewicht \(kg\)/), '80.5');
    await user.type(screen.getByLabelText(/Taille/), '85');
    await user.click(screen.getByRole('button', { name: /Anlegen/ }));

    // We navigate back to /koerper/verlauf which renders the history tab.
    await waitFor(async () => {
      expect(await db.bodyMetrics.count()).toBe(1);
    });
    // The new entry summary is visible.
    expect(await screen.findByText(/80\.5 kg/)).toBeInTheDocument();
    expect(screen.getByText(/Taille 85 cm/)).toBeInTheDocument();
  });

  it('renders the photo gallery grouped by view when photos exist', async () => {
    await savePhoto({
      date: NOW,
      imageBlob: new Blob(['x'], { type: 'image/jpeg' }),
      view: 'front',
    });
    await savePhoto({
      date: NOW - 86_400_000,
      imageBlob: new Blob(['y'], { type: 'image/jpeg' }),
      view: 'side',
    });
    render(
      <MemoryRouter initialEntries={['/koerper/fotos']}>
        <App />
      </MemoryRouter>,
    );
    // Each group header lists the count.
    expect(await screen.findByText(/Front · 1/)).toBeInTheDocument();
    expect(screen.getByText(/Seite · 1/)).toBeInTheDocument();
  });

  it('photo compare page shows an empty hint when fewer than two photos exist for a view', async () => {
    await savePhoto({
      date: NOW,
      imageBlob: new Blob(['x'], { type: 'image/jpeg' }),
      view: 'front',
    });
    render(
      <MemoryRouter initialEntries={['/koerper/foto/vergleich']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/mindestens zwei Fotos/)).toBeInTheDocument();
  });

  it('compare page lets you pick two photos of the same view side-by-side', async () => {
    await savePhoto({
      date: NOW,
      imageBlob: new Blob(['new'], { type: 'image/jpeg' }),
      view: 'front',
    });
    await savePhoto({
      date: NOW - 90 * 86_400_000,
      imageBlob: new Blob(['old'], { type: 'image/jpeg' }),
      view: 'front',
    });
    render(
      <MemoryRouter initialEntries={['/koerper/foto/vergleich']}>
        <App />
      </MemoryRouter>,
    );
    // Two selects (one per pane), each with two date options.
    const vorher = await screen.findByLabelText(/Vorher auswählen/);
    const nachher = screen.getByLabelText(/Nachher auswählen/);
    expect(within(vorher).getAllByRole('option')).toHaveLength(2);
    expect(within(nachher).getAllByRole('option')).toHaveLength(2);
    // Default "Abstand" reflects the 90-day gap.
    expect(screen.getByText(/Abstand: 90 Tage/)).toBeInTheDocument();
  });

  it('history tab plots weight + waist when measurements are populated', async () => {
    await saveBodyMetric({ date: NOW - 14 * 86_400_000, weightKg: 81, measurements: { waistCm: 86 } });
    await saveBodyMetric({ date: NOW - 7 * 86_400_000, weightKg: 80, measurements: { waistCm: 85 } });
    await saveBodyMetric({ date: NOW, weightKg: 79, measurements: { waistCm: 84 } });

    render(
      <MemoryRouter initialEntries={['/koerper/verlauf']}>
        <App />
      </MemoryRouter>,
    );
    // Both chart titles render.
    expect(await screen.findByText(/Gewicht \(kg\)/)).toBeInTheDocument();
    expect(screen.getByText(/Taille \(cm\)/)).toBeInTheDocument();
  });
});
