import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { compressImageBlob, savePhoto } from './bodyLib';
import type { PhotoView } from '../../db/schema';

const VIEW_OPTIONS: { value: PhotoView; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Seite' },
  { value: 'back', label: 'Rücken' },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateIso(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12).getTime();
}

export function PhotoFormPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<PhotoView>('front');
  const [dateInput, setDateInput] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [pickedBlob, setPickedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImageBlob(file, { maxDimensionPx: 1600 });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPickedBlob(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch (err) {
      setError(`Bild konnte nicht verarbeitet werden: ${(err as Error).message}`);
    } finally {
      setCompressing(false);
    }
  };

  const removePicked = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPickedBlob(null);
    setPreviewUrl(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pickedBlob) {
      setError('Bitte ein Bild auswählen.');
      return;
    }
    setSaving(true);
    try {
      await savePhoto({
        date: parseDateIso(dateInput),
        imageBlob: pickedBlob,
        view,
        notes,
      });
      navigate('/koerper/fotos');
    } catch (err) {
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <Link
        to="/koerper/fotos"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>
      <h1 className="mb-4 text-xl font-semibold">Neues Foto</h1>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Ansicht
          </span>
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setView(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  view === opt.value
                    ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Datum
          </span>
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </label>

        <div>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Bild
          </span>
          {previewUrl ? (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                <img src={previewUrl} alt="Vorschau" className="max-h-96 w-full object-contain" />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={removePicked}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                >
                  <Trash2 className="h-3 w-3" /> Entfernen
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500 hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800/40"
            >
              <Camera className="h-6 w-6" />
              {compressing ? 'Verarbeite Bild…' : 'Foto aufnehmen oder auswählen'}
              <span className="text-xs text-slate-400">JPEG/PNG · max 1600 px</span>
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFile}
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Notiz (optional)
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving || compressing || !pickedBlob} className="flex-1">
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Abbrechen
          </Button>
        </div>
      </form>
    </div>
  );
}
