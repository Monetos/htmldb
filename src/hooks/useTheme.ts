import { useCallback, useEffect, useState } from 'react';
import { db, ensureSettings } from '../db/database';
import type { ThemeMode } from '../db/schema';

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureSettings().then((settings) => {
      if (cancelled) return;
      setTheme(settings.theme);
      applyTheme(settings.theme);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback(async () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    await db.settings.update('singleton', { theme: next, updatedAt: Date.now() });
  }, [theme]);

  return { theme, toggle, ready };
}
