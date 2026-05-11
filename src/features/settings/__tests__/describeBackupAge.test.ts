import { describe, expect, it } from 'vitest';
import { describeBackupAge } from '../backupAge';

const NOW = new Date(2026, 4, 11, 12).getTime();
const DAY = 24 * 60 * 60 * 1000;

describe('describeBackupAge', () => {
  it('warns when no backup has been recorded yet', () => {
    expect(describeBackupAge(undefined, NOW)).toEqual({
      text: 'Noch nie exportiert.',
      warn: true,
    });
  });

  it('says "heute" within the last 24 hours', () => {
    expect(describeBackupAge(NOW - 2 * 60 * 60 * 1000, NOW)).toEqual({
      text: 'heute exportiert.',
      warn: false,
    });
  });

  it('says "vor 1 Tag" between 24 and 48 hours', () => {
    expect(describeBackupAge(NOW - 1.2 * DAY, NOW)).toEqual({
      text: 'vor 1 Tag exportiert.',
      warn: false,
    });
  });

  it('does not warn at exactly 14 days', () => {
    expect(describeBackupAge(NOW - 14 * DAY, NOW).warn).toBe(false);
  });

  it('warns once the gap exceeds 14 days', () => {
    expect(describeBackupAge(NOW - 15 * DAY, NOW)).toEqual({
      text: 'vor 15 Tagen exportiert.',
      warn: true,
    });
  });
});
