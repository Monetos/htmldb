import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../SettingsPage';
import { useAppUpdate } from '../../../store/appUpdate';

// Render SettingsPage in isolation (not the full <App />) so <UpdatePrompt />
// doesn't also mount — it independently wires the store's `registration` via
// its own onRegisteredSW callback, which would clobber whatever this test
// sets up.
async function renderSettings() {
  return render(
    <MemoryRouter initialEntries={['/einstellungen']}>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('UpdateCheckCard', () => {
  beforeEach(() => {
    useAppUpdate.getState().reset();
  });

  afterEach(() => {
    useAppUpdate.getState().reset();
  });

  it('shows "unsupported" when clicked before any registration exists', async () => {
    await renderSettings();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Nach Updates suchen' }));
    expect(
      await screen.findByText('Updates können auf diesem Gerät derzeit nicht geprüft werden.'),
    ).toBeInTheDocument();
  });

  it('calls registration.update() and shows the checking status when a registration exists', async () => {
    const update = vi.fn(async () => {});
    useAppUpdate.getState().setRegistration({ update } as unknown as ServiceWorkerRegistration);

    await renderSettings();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Nach Updates suchen' }));

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  });

  it('renders the up-to-date message', async () => {
    useAppUpdate.setState({ checkStatus: 'up-to-date' });
    await renderSettings();
    expect(await screen.findByText('Du hast bereits die neueste Version.')).toBeInTheDocument();
  });

  it('renders the update-found message', async () => {
    useAppUpdate.setState({ checkStatus: 'update-found' });
    await renderSettings();
    expect(
      await screen.findByText(/Eine neue Version wurde gefunden/),
    ).toBeInTheDocument();
  });

  it('renders the error message', async () => {
    useAppUpdate.setState({ checkStatus: 'error' });
    await renderSettings();
    expect(
      await screen.findByText('Prüfung fehlgeschlagen. Bitte später erneut versuchen.'),
    ).toBeInTheDocument();
  });

  it('does not call update() twice on a rapid double click', async () => {
    const update = vi.fn(async () => {});
    useAppUpdate.getState().setRegistration({ update } as unknown as ServiceWorkerRegistration);

    await renderSettings();
    const user = userEvent.setup();
    const button = await screen.findByRole('button', { name: 'Nach Updates suchen' });
    await user.click(button);
    await user.click(button);

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  });
});
