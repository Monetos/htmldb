import { create } from 'zustand';
import type { PhotoView } from '../db/schema';

/**
 * In-memory draft for the progress-photo form. Lives in a module-level store
 * (not component state) so switching tabs or navigating away does NOT discard
 * a photo the user just took — a top user complaint. Cleared on save/discard.
 */
interface PhotoDraftState {
  blob: Blob | null;
  view: PhotoView;
  dateInput: string; // YYYY-MM-DD, empty = today
  notes: string;
  setBlob: (blob: Blob | null) => void;
  setView: (view: PhotoView) => void;
  setDateInput: (v: string) => void;
  setNotes: (v: string) => void;
  clear: () => void;
}

export const usePhotoDraft = create<PhotoDraftState>()((set) => ({
  blob: null,
  view: 'front',
  dateInput: '',
  notes: '',
  setBlob: (blob) => set({ blob }),
  setView: (view) => set({ view }),
  setDateInput: (dateInput) => set({ dateInput }),
  setNotes: (notes) => set({ notes }),
  clear: () => set({ blob: null, view: 'front', dateInput: '', notes: '' }),
}));
