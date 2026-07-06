import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { UpdatePrompt } from '../UpdatePrompt';
import { PERIODIC_UPDATE_CHECK_MS, useAppUpdate } from '../../store/appUpdate';
import { fakeRegistration, resetFakeRegistration } from '../../test/stubs/pwa-register-react';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    configurable: true,
  });
}

/**
 * checkForUpdates() guards against overlap while checkStatus === 'checking',
 * and in production only leaves that state after a real multi-second grace
 * period (tested in appUpdate.test.ts). Bypass that timing here so these
 * tests only assert "does this trigger call checkForUpdates()", not the
 * store's internal status-transition timing.
 */
function markCheckSettled() {
  useAppUpdate.setState({ checkStatus: 'up-to-date' });
}

describe('UpdatePrompt active update checks', () => {
  beforeEach(() => {
    useAppUpdate.getState().reset();
    resetFakeRegistration();
    setVisibility('visible');
  });

  afterEach(() => {
    useAppUpdate.getState().reset();
  });

  it('checks for updates once right after the service worker registers', async () => {
    render(<UpdatePrompt />);
    await waitFor(() => {
      expect(fakeRegistration.update).toHaveBeenCalledTimes(1);
    });
  });

  it('checks again when the document becomes visible', async () => {
    render(<UpdatePrompt />);
    await waitFor(() => expect(fakeRegistration.update).toHaveBeenCalledTimes(1));
    markCheckSettled();

    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => expect(fakeRegistration.update).toHaveBeenCalledTimes(2));
  });

  it('does not check when visibilitychange fires while hidden', async () => {
    render(<UpdatePrompt />);
    await waitFor(() => expect(fakeRegistration.update).toHaveBeenCalledTimes(1));
    markCheckSettled();

    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    // Give any accidental async check a chance to run before asserting it didn't.
    await new Promise((r) => setTimeout(r, 10));
    expect(fakeRegistration.update).toHaveBeenCalledTimes(1);
  });

  it('checks again on window focus', async () => {
    render(<UpdatePrompt />);
    await waitFor(() => expect(fakeRegistration.update).toHaveBeenCalledTimes(1));
    markCheckSettled();

    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(fakeRegistration.update).toHaveBeenCalledTimes(2));
  });

  it('sets up a periodic check interval and clears it on unmount', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    const { unmount } = render(<UpdatePrompt />);
    await waitFor(() => expect(fakeRegistration.update).toHaveBeenCalledTimes(1));
    markCheckSettled();

    const callIndex = setIntervalSpy.mock.calls.findIndex(
      ([, ms]) => ms === PERIODIC_UPDATE_CHECK_MS,
    );
    expect(callIndex).toBeGreaterThanOrEqual(0);
    const callback = setIntervalSpy.mock.calls[callIndex][0] as () => void;
    const handle = setIntervalSpy.mock.results[callIndex]?.value;

    callback();
    await waitFor(() => expect(fakeRegistration.update).toHaveBeenCalledTimes(2));

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalledWith(handle);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
