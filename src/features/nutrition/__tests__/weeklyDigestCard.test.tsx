import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WeekTab } from '../WeekTab';

describe('WeeklyDigestCard', () => {
  it('shows the no-API-key gate with a link to settings when no key is configured', async () => {
    render(
      <MemoryRouter>
        <WeekTab />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: /Wochenrückblick/ })).toBeInTheDocument();
    expect(
      screen.getByText(/Für den KI-Wochenrückblick brauchst du einen Anthropic-API-Key/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /In den Einstellungen hinterlegen/ })).toHaveAttribute(
      'href',
      '/einstellungen',
    );
  });
});
