import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Images, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { compressImageBlob, savePhoto } from './bodyLib';
import { usePhotoDraft } from '../../store/photoDraft';
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
  // Draft lives in a global store so it survives tab switches / navigation.
  const draft = usePhotoDraft();
  const dateInput = draft.dateInput || todayIso();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!draft.blob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(draft.blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.blob]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImageBlob(file, { maxDimensionPx: 1600 });
      draft.setBlob(compressed);
    } catch (err) {
      setError(`Bild konnte nicht verarbeitet werden: ${(err as Error).message}`);
    } finally {
      setCompressing(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!draft.blob) {
      setError('Bitte ein Bild auswählen.');
      return;
    }
    setSaving(true);
    try {
      await savePhoto({
        date: parseDateIso(dateInput),
        imageBlob: draft.blob,
        view: draft.view,
        notes: draft.notes,
      });
      draft.clear();
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
      <h1 className="mb-1 text-xl font-semibold">Neues Foto</h1>
      <p className="mb-4 text-xs text-slate-500">
        Dein Entwurf bleibt erhalten, auch wenn du kurz in einen anderen Tab wechselst.
      </p>

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
                onClick={() => draft.setView(opt.value)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  draft.view === opt.value
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
            onChange={(e) => draft.setDateInput(e.target.value)}
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
                  onClick={() => draft.setBlob(null)}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                >
                  <Trash2 className="h-3 w-3" /> Entfernen
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => cameraInput.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <Camera className="h-6 w-6" />
                {compressing ? 'Verarbeite…' : 'Foto aufnehmen'}
              </button>
              <button
                type="button"
                onClick={() => galleryInput.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500 hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <Images className="h-6 w-6" />
                Aus Galerie
              </button>
            </div>
          )}
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={onFile}
          />
          <input
            ref={galleryInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Notiz (optional)
          </span>
          <textarea
            value={draft.notes}
            onChange={(e) => draft.setNotes(e.target.value)}
            className="min-h-[60px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
        </label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="submit" disabled={saving || compressing || !draft.blob} className="flex-1">
            {saving ? 'Speichern…' : 'Speichern'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              draft.clear();
              navigate(-1);
            }}
          >
            Verwerfen
          </Button>
        </div>
      </form>
    </div>
  );
}
