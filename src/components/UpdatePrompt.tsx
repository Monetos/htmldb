import { useEffect, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './Button';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      console.warn('Service worker registration failed', error);
    },
  });

  // Auto-dismiss the "offline ready" toast after a few seconds.
  const [autoDismissed, setAutoDismissed] = useState(false);
  useEffect(() => {
    if (!offlineReady) return;
    const handle = setTimeout(() => setAutoDismissed(true), 4000);
    return () => clearTimeout(handle);
  }, [offlineReady]);

  if (needRefresh) {
    return (
      <Toast role="status">
        <div className="flex-1">
          <div className="text-sm font-medium">Neue Version verfügbar</div>
          <p className="text-xs text-slate-500">
            Aktualisiere, um die neue Version zu laden.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            void updateServiceWorker(true);
          }}
        >
          Aktualisieren
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
          Später
        </Button>
      </Toast>
    );
  }

  if (offlineReady && !autoDismissed) {
    return (
      <Toast role="status" onDismiss={() => setOfflineReady(false)}>
        <span className="text-sm">App ist offline-fähig.</span>
      </Toast>
    );
  }

  return null;
}

function Toast({
  children,
  role,
  onDismiss,
}: {
  children: ReactNode;
  role?: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      role={role}
      className="fixed bottom-20 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-center gap-2">
        {children}
        {onDismiss ? (
          <button
            type="button"
            aria-label="Schließen"
            onClick={onDismiss}
            className="ml-1 text-slate-400 hover:text-slate-700"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
