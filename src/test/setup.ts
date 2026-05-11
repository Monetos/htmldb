import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { db } from '../db/database';

// jsdom lacks ResizeObserver, which Recharts depends on for ResponsiveContainer.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}

// Reset strategy: unmount React first (so no useEffect promises are still in
// flight), then clear every Dexie table. We deliberately do not delete the
// database itself — the shared `db` singleton stays open across tests, which
// keeps the schema stable and avoids DatabaseClosedError races.
afterEach(async () => {
  cleanup();
  document.documentElement.classList.remove('dark');
  await Promise.all(db.tables.map((t) => t.clear()));
});

beforeEach(async () => {
  // Belt-and-braces: also wipe before each test in case a previous run crashed
  // mid-test and left rows behind.
  await Promise.all(db.tables.map((t) => t.clear()));
});
