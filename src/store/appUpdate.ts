import { create } from 'zustand';

/**
 * Shared PWA-update state. Only one useRegisterSW() instance exists in the
 * app (in UpdatePrompt), because vite-plugin-pwa's hook creates an
 * independent Workbox registration per call site — so this store is how
 * other components (e.g. the Settings "check now" button) can read/trigger
 * update checks without spinning up a second, disconnected registration.
 */
export type UpdateCheckStatus =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'update-found'
  | 'unsupported'
  | 'error';

export const PERIODIC_UPDATE_CHECK_MS = 5 * 60 * 1000;
/**
 * There is no "no update available" signal in the Service Worker API — only
 * a positive onNeedRefresh callback. This grace period is the heuristic we
 * use to say "nothing happened" if no real signal arrived in time.
 */
export const UPDATE_FOUND_GRACE_MS = 4000;

interface AppUpdateState {
  registration: ServiceWorkerRegistration | null;
  needRefresh: boolean;
  updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null;
  checkStatus: UpdateCheckStatus;
  lastCheckedAt: number | null;

  setRegistration: (registration: ServiceWorkerRegistration | null) => void;
  setNeedRefresh: (needRefresh: boolean) => void;
  setUpdateServiceWorker: (fn: (reloadPage?: boolean) => Promise<void>) => void;
  checkForUpdates: () => Promise<void>;
  reset: () => void;
}

export const useAppUpdate = create<AppUpdateState>()((set, get) => ({
  registration: null,
  needRefresh: false,
  updateServiceWorker: null,
  checkStatus: 'idle',
  lastCheckedAt: null,

  setRegistration: (registration) => set({ registration }),

  setNeedRefresh: (needRefresh) => {
    set((state) => ({
      needRefresh,
      // A real needRefresh signal is definitive — don't wait on the grace
      // period timeout to reflect it, and clear a stale 'update-found' once
      // the toast has been dismissed/applied.
      checkStatus: needRefresh
        ? 'update-found'
        : state.checkStatus === 'update-found'
          ? 'idle'
          : state.checkStatus,
    }));
  },

  setUpdateServiceWorker: (fn) => set({ updateServiceWorker: fn }),

  checkForUpdates: async () => {
    const { checkStatus, registration } = get();
    if (checkStatus === 'checking') return;
    if (!registration) {
      set({ checkStatus: 'unsupported' });
      return;
    }
    set({ checkStatus: 'checking' });
    try {
      await registration.update();
      set({ lastCheckedAt: Date.now() });
      setTimeout(() => {
        // Only resolve to "up to date" if nothing more definitive (a real
        // needRefresh signal, or a newer check) has already moved this on.
        if (get().checkStatus === 'checking') set({ checkStatus: 'up-to-date' });
      }, UPDATE_FOUND_GRACE_MS);
    } catch {
      set({ checkStatus: 'error' });
    }
  },

  reset: () =>
    set({
      registration: null,
      needRefresh: false,
      updateServiceWorker: null,
      checkStatus: 'idle',
      lastCheckedAt: null,
    }),
}));
