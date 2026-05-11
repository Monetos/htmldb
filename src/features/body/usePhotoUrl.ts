import { useEffect, useState } from 'react';

/**
 * Wraps a Blob into a stable object URL and revokes it on unmount / change so
 * we never leak in-memory references when scrolling through galleries.
 */
export function usePhotoUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    let next: string | null = null;
    try {
      next = URL.createObjectURL(blob);
    } catch {
      // jsdom / older runtimes may not accept the stored payload as a Blob.
      // Silently degrade to the placeholder thumbnail.
      setUrl(null);
      return;
    }
    setUrl(next);
    return () => {
      if (next) URL.revokeObjectURL(next);
    };
  }, [blob]);

  return url;
}
