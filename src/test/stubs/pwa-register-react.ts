import { useEffect, useState } from 'react';
import { vi } from 'vitest';

interface RegisterOptions {
  onRegisterError?: (err: unknown) => void;
  onRegisteredSW?: (
    swUrl: string,
    registration: ServiceWorkerRegistration | undefined,
  ) => void;
}

interface RegisterReturn {
  needRefresh: [boolean, (v: boolean) => void];
  offlineReady: [boolean, (v: boolean) => void];
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

/** Test-controllable fake registration handed to onRegisteredSW callbacks. */
export const fakeRegistration = {
  update: vi.fn(async () => {}),
} as unknown as ServiceWorkerRegistration;

/**
 * `restoreMocks: true` in vitest.config only resets vi.spyOn() spies, not
 * plain vi.fn() mocks — call this in a test's beforeEach to clear call
 * history on fakeRegistration.update between tests in the same file.
 */
export function resetFakeRegistration() {
  (fakeRegistration.update as unknown as ReturnType<typeof vi.fn>).mockClear();
}

export function useRegisterSW(options: RegisterOptions = {}): RegisterReturn {
  const needRefresh = useState(false);
  const offlineReady = useState(false);

  useEffect(() => {
    options.onRegisteredSW?.('/sw.js', fakeRegistration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async () => {},
  };
}
