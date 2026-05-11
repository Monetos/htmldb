const DAY_MS = 24 * 60 * 60 * 1000;
const WARN_AFTER_DAYS = 14;

export function describeBackupAge(
  ts: number | undefined,
  now: number,
): { text: string; warn: boolean } {
  if (!ts) return { text: 'Noch nie exportiert.', warn: true };
  const days = Math.floor((now - ts) / DAY_MS);
  if (days <= 0) return { text: 'heute exportiert.', warn: false };
  if (days === 1) return { text: 'vor 1 Tag exportiert.', warn: false };
  return {
    text: `vor ${days} Tagen exportiert.`,
    warn: days > WARN_AFTER_DAYS,
  };
}
