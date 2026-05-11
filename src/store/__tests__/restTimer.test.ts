import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRestTimer } from '../restTimer';

describe('useRestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useRestTimer.getState().skip();
  });

  afterEach(() => {
    useRestTimer.getState().skip();
    vi.useRealTimers();
  });

  it('starts at the requested duration and counts down to zero', () => {
    useRestTimer.getState().start(3);
    expect(useRestTimer.getState().remaining).toBe(3);

    vi.advanceTimersByTime(1000);
    expect(useRestTimer.getState().remaining).toBeLessThanOrEqual(3);
    expect(useRestTimer.getState().remaining).toBeGreaterThanOrEqual(2);

    vi.advanceTimersByTime(2500);
    expect(useRestTimer.getState().remaining).toBe(0);
    // Once the timer fires the run ends.
    expect(useRestTimer.getState().expiresAt).toBeNull();
  });

  it('add(30) extends an active timer by 30 seconds', () => {
    useRestTimer.getState().start(60);
    vi.advanceTimersByTime(500);
    useRestTimer.getState().add(30);
    expect(useRestTimer.getState().remaining).toBeGreaterThanOrEqual(89);
    expect(useRestTimer.getState().remaining).toBeLessThanOrEqual(90);
  });

  it('add() does nothing when no timer is active', () => {
    useRestTimer.getState().add(30);
    expect(useRestTimer.getState().expiresAt).toBeNull();
    expect(useRestTimer.getState().remaining).toBe(0);
  });

  it('skip() stops the timer immediately', () => {
    useRestTimer.getState().start(120);
    useRestTimer.getState().skip();
    expect(useRestTimer.getState().expiresAt).toBeNull();
    expect(useRestTimer.getState().remaining).toBe(0);
  });

  it('starting a new timer replaces the previous one (no leaked intervals)', () => {
    useRestTimer.getState().start(120);
    useRestTimer.getState().start(30);
    expect(useRestTimer.getState().totalSeconds).toBe(30);
    expect(useRestTimer.getState().remaining).toBe(30);
  });
});
