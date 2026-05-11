import { useState } from 'react';

interface RegisterOptions {
  onRegisterError?: (err: unknown) => void;
}

interface RegisterReturn {
  needRefresh: [boolean, (v: boolean) => void];
  offlineReady: [boolean, (v: boolean) => void];
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useRegisterSW(_options?: RegisterOptions): RegisterReturn {
  const needRefresh = useState(false);
  const offlineReady = useState(false);
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async () => {},
  };
}
