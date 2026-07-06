import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { db } from '../db/database';

function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>,
  );
}

describe('App shell', () => {
  it('renders all six bottom-tab destinations', () => {
    renderApp();
    for (const label of ['Home', 'Training', 'Übungen', 'Statistik', 'Körper', 'Ernährung']) {
      // Each label appears at least once (the bottom nav link). Some pages also
      // render the same label in the header, which is fine.
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('navigates to the matching page when a bottom tab is tapped', async () => {
    renderApp();
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: /Ernährung/ }));
    expect(await screen.findByRole('heading', { name: 'Ernährung' })).toBeInTheDocument();
  });

  it('toggles the dark class on <html> and persists the choice to IndexedDB', async () => {
    renderApp(['/training']);
    const user = userEvent.setup();

    // useTheme reads settings on mount; wait for the singleton to land.
    await waitFor(async () => {
      expect(await db.settings.count()).toBe(1);
    });

    // App.html starts in dark by default. The header toggle button is labelled
    // by the *next* mode ("Helles Design" when we are currently dark).
    expect(document.documentElement).toHaveClass('dark');
    await user.click(screen.getByRole('button', { name: 'Helles Design' }));

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass('dark');
    });
    const persisted = await db.settings.get('singleton');
    expect(persisted?.theme).toBe('light');
  });
});
