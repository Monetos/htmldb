import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './Button';
import { Toast } from './Toast';
import { PERIODIC_UPDATE_CHECK_MS, useAppUpdate } from '../store/appUpdate';

export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      useAppUpdate.getState().setRegistration(registration ?? null);
    },
    onRegisterError(error: unknown) {
      console.warn('Service worker registration failed', error);
    },
  });

  const registration = useAppUpdate((s) => s.registration);
  const checkForUpdates = useAppUpdate((s) => s.checkForUpdates);
  const setStoreNeedRefresh = useAppUpdate((s) => s.setNeedRefresh);
  const setStoreUpdateServiceWorker = useAppUpdate((s) => s.setUpdateServiceWorker);

  // Publish this hook instance's state/actions into the shared store so other
  // components (e.g. the "Nach Updates suchen" button in Settings) can react
  // to and trigger checks without creating a second, disconnected
  // useRegisterSW() registration.
  useEffect(() => {
    setStoreUpdateServiceWorker(updateServiceWorker);
  }, [updateServiceWorker, setStoreUpdateServiceWorker]);

  useEffect(() => {
    setStoreNeedRefresh(needRefresh);
  }, [needRefresh, setStoreNeedRefresh]);

  // Check right away once we have a registration, in case an update is
  // already waiting server-side from a deploy that happened while the app
  // was closed.
  useEffect(() => {
    if (registration) void checkForUpdates();
  }, [registration, checkForUpdates]);

  // Active update detection: vite-plugin-pwa's useRegisterSW only reacts
  // passively to the browser's own (throttled, ~24h) native update check,
  // which for an installed home-screen PWA may not fire for days. Force a
  // check whenever the app becomes visible again (the most valuable trigger
  // for an app opened in short bursts), plus a periodic fallback for long
  // sessions left open.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkForUpdates();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [checkForUpdates]);

  useEffect(() => {
    const id = setInterval(() => void checkForUpdates(), PERIODIC_UPDATE_CHECK_MS);
    return () => clearInterval(id);
  }, [checkForUpdates]);

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
