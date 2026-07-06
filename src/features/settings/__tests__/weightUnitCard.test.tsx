import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../SettingsPage';
import { db } from '../../../db/database';

async function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/einstellungen']}>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('WeightUnitCard', () => {
  it('defaults to kg pressed', async () => {
    await renderSettings();
    expect(await screen.findByRole('button', { name: 'kg' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'lbs' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('persists lbs to settings when clicked and flips the pressed state', async () => {
    await renderSettings();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'lbs' }));

    await waitFor(async () => {
      const settings = await db.settings.get('singleton');
      expect(settings?.weightUnit).toBe('lbs');
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'lbs' })).toHaveAttribute('aria-pressed', 'true');
    });
    expect(screen.getByRole('button', { name: 'kg' })).toHaveAttribute('aria-pressed', 'false');
  });
});
