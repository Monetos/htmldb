export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older environments. Not cryptographically strong, fine for
  // local-only IDs.
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
