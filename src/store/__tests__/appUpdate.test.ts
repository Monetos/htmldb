import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UPDATE_FOUND_GRACE_MS, useAppUpdate } from '../appUpdate';

function fakeRegistration(update: () => Promise<void>) {
  return { update } as unknown as ServiceWorkerRegistration;
}

describe('useAppUpdate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useAppUpdate.getState().reset();
  });

  afterEach(() => {
    useAppUpdate.getState().reset();
    vi.useRealTimers();
  });

  it('checkForUpdates() sets "unsupported" when there is no registration', async () => {
    await useAppUpdate.getState().checkForUpdates();
    expect(useAppUpdate.getState().checkStatus).toBe('unsupported');
  });

  it('checkForUpdates() goes checking -> up-to-date after the grace period when nothing happens', async () => {
    const update = vi.fn(async () => {});
    useAppUpdate.getState().setRegistration(fakeRegistration(update));

    const promise = useAppUpdate.getState().checkForUpdates();
    // Right after calling update(), before the grace timer fires.
    await promise;
    expect(update).toHaveBeenCalledTimes(1);
    expect(useAppUpdate.getState().checkStatus).toBe('checking');
    expect(useAppUpdate.getState().lastCheckedAt).not.toBeNull();

    vi.advanceTimersByTime(UPDATE_FOUND_GRACE_MS);
    expect(useAppUpdate.getState().checkStatus).toBe('up-to-date');
  });

  it('setNeedRefresh(true) immediately flips status to update-found, even mid-check', async () => {
    const update = vi.fn(async () => {});
    useAppUpdate.getState().setRegistration(fakeRegistration(update));
    await useAppUpdate.getState().checkForUpdates();
    expect(useAppUpdate.getState().checkStatus).toBe('checking');

    useAppUpdate.getState().setNeedRefresh(true);
    expect(useAppUpdate.getState().checkStatus).toBe('update-found');

    // The grace-period timeout must not clobber the real signal.
    vi.advanceTimersByTime(UPDATE_FOUND_GRACE_MS);
    expect(useAppUpdate.getState().checkStatus).toBe('update-found');
  });

  it('setNeedRefresh(false) resets an update-found status back to idle', () => {
    useAppUpdate.setState({ checkStatus: 'update-found' });
    useAppUpdate.getState().setNeedRefresh(false);
    expect(useAppUpdate.getState().checkStatus).toBe('idle');
  });

  it('a second checkForUpdates() call while one is in flight is a no-op', async () => {
    const update = vi.fn(async () => {});
    useAppUpdate.getState().setRegistration(fakeRegistration(update));

    const first = useAppUpdate.getState().checkForUpdates();
    const second = useAppUpdate.getState().checkForUpdates();
    await Promise.all([first, second]);

    expect(update).toHaveBeenCalledTimes(1);
  });

  it('checkForUpdates() sets "error" when registration.update() rejects', async () => {
    const update = vi.fn(async () => {
      throw new Error('network down');
    });
    useAppUpdate.getState().setRegistration(fakeRegistration(update));
    await useAppUpdate.getState().checkForUpdates();
    expect(useAppUpdate.getState().checkStatus).toBe('error');
  });

  it('setRegistration / setUpdateServiceWorker store the given values', () => {
    const reg = fakeRegistration(async () => {});
    useAppUpdate.getState().setRegistration(reg);
    expect(useAppUpdate.getState().registration).toBe(reg);

    const fn = async () => {};
    useAppUpdate.getState().setUpdateServiceWorker(fn);
    expect(useAppUpdate.getState().updateServiceWorker).toBe(fn);
  });

  it('reset() restores every field to its initial value', () => {
    useAppUpdate.setState({
      registration: fakeRegistration(async () => {}),
      needRefresh: true,
      checkStatus: 'error',
      lastCheckedAt: 123,
    });
    useAppUpdate.getState().reset();
    const s = useAppUpdate.getState();
    expect(s.registration).toBeNull();
    expect(s.needRefresh).toBe(false);
    expect(s.updateServiceWorker).toBeNull();
    expect(s.checkStatus).toBe('idle');
    expect(s.lastCheckedAt).toBeNull();
  });
});
