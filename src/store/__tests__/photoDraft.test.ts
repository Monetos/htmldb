import { beforeEach, describe, expect, it } from 'vitest';
import { usePhotoDraft } from '../photoDraft';

describe('usePhotoDraft store', () => {
  beforeEach(() => {
    usePhotoDraft.getState().clear();
  });

  it('keeps the blob across "unmounts" (module-level state)', () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    usePhotoDraft.getState().setBlob(blob);
    usePhotoDraft.getState().setView('side');
    usePhotoDraft.getState().setNotes('nach dem Training');
    // A component unmount doesn't touch the store — same state on next read.
    expect(usePhotoDraft.getState().blob).toBe(blob);
    expect(usePhotoDraft.getState().view).toBe('side');
    expect(usePhotoDraft.getState().notes).toBe('nach dem Training');
  });

  it('clear() resets everything to defaults', () => {
    usePhotoDraft.getState().setBlob(new Blob(['x']));
    usePhotoDraft.getState().setDateInput('2026-01-01');
    usePhotoDraft.getState().clear();
    const s = usePhotoDraft.getState();
    expect(s.blob).toBeNull();
    expect(s.view).toBe('front');
    expect(s.dateInput).toBe('');
    expect(s.notes).toBe('');
  });
});
