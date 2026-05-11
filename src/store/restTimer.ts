import { create } from 'zustand';

interface RestTimerState {
  /** Wall-clock timestamp the timer should fire at, or null when inactive. */
  expiresAt: number | null;
  /** Total seconds for the current run (used to render progress / labels). */
  totalSeconds: number;
  /** Internal: tick interval handle so we never start two parallel intervals. */
  _tickHandle: number | null;
  /** Internal: current tick value, exposed for components that re-render on it. */
  remaining: number;
  start: (seconds: number) => void;
  add: (seconds: number) => void;
  skip: () => void;
}

function clearTick(handle: number | null) {
  if (handle !== null) clearInterval(handle);
}

function vibrate() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate?.([120, 80, 200]);
  }
}

export const useRestTimer = create<RestTimerState>()((set, get) => ({
  expiresAt: null,
  totalSeconds: 0,
  _tickHandle: null,
  remaining: 0,

  start(seconds) {
    clearTick(get()._tickHandle);
    const expiresAt = Date.now() + seconds * 1000;
    const handle = setInterval(() => {
      const exp = get().expiresAt;
      if (exp === null) return;
      const remaining = Math.max(0, Math.ceil((exp - Date.now()) / 1000));
      set({ remaining });
      if (remaining === 0) {
        clearTick(get()._tickHandle);
        vibrate();
        set({ _tickHandle: null, expiresAt: null });
      }
    }, 250) as unknown as number;
    set({ expiresAt, totalSeconds: seconds, remaining: seconds, _tickHandle: handle });
  },

  add(seconds) {
    const { expiresAt, totalSeconds } = get();
    if (expiresAt === null) return;
    const nextExpiresAt = Math.max(Date.now(), expiresAt + seconds * 1000);
    const remaining = Math.max(0, Math.ceil((nextExpiresAt - Date.now()) / 1000));
    set({
      expiresAt: nextExpiresAt,
      totalSeconds: Math.max(0, totalSeconds + seconds),
      remaining,
    });
  },

  skip() {
    clearTick(get()._tickHandle);
    set({ expiresAt: null, totalSeconds: 0, remaining: 0, _tickHandle: null });
  },
}));
