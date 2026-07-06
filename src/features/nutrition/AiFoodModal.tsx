import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Loader2, Sparkles, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { Food } from '../../db/schema';
import { Button } from '../../components/Button';
import { compressImageBlob } from '../body/bodyLib';
import { saveFood } from './nutritionLib';
import { AiError, estimateFoodFromImage, estimateFoodFromText, type FoodEstimate } from './aiLib';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called with the saved Food (and optional portion suggestion) after confirmation. */
  onFoodReady: (food: Food, suggestedPortionG?: number) => void;
}

type Mode = 'text' | 'photo';

const CONFIDENCE_LABEL: Record<FoodEstimate['confidence'], string> = {
  high: 'hohe Sicherheit',
  medium: 'mittlere Sicherheit',
  low: 'grobe Schätzung',
};

export function AiFoodModal({ open, onClose, onFoodReady }: Props) {
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const apiKey = settings?.anthropicApiKey ?? '';

  const [mode, setMode] = useState<Mode>('text');
  const [description, setDescription] = useState('');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<FoodEstimate | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setMode('text');
      setDescription('');
      setPhotoBlob(null);
      setHint('');
      setBusy(false);
      setError(null);
      setEstimate(null);
    }
  }, [open]);

  useEffect(() => {
    if (!photoBlob) {
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoBlob);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoBlob]);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    // Downscale aggressively — 1024px is plenty for food recognition and keeps
    // the request (base64) small.
    const compressed = await compressImageBlob(file, { maxDimensionPx: 1024, quality: 0.8 });
    setPhotoBlob(compressed);
  };

  const run = async () => {
    setError(null);
    setBusy(true);
    setEstimate(null);
    try {
      const result =
        mode === 'text'
          ? await estimateFoodFromText(apiKey, description)
          : await estimateFoodFromImage(apiKey, photoBlob!, hint);
      setEstimate(result);
    } catch (err) {
      setError(err instanceof AiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!estimate) return;
    const food = await saveFood({
      name: estimate.name,
      brand: estimate.brand,
      per100g: {
        kcal: Math.round(estimate.per100g.kcal),
        protein: Math.round(estimate.per100g.protein * 10) / 10,
        carbs: Math.round(estimate.per100g.carbs * 10) / 10,
        fat: Math.round(estimate.per100g.fat * 10) / 10,
      },
    });
    onFoodReady(food, estimate.suggestedPortionG);
  };

  if (!open) return null;

  const canRun =
    !busy && (mode === 'text' ? description.trim().length >= 3 : photoBlob !== null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="KI-Schätzung"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-slate-900 sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-brand-500" /> KI-Schätzung
          </h2>
          <button
            type="button"
            aria-label="Schließen"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!apiKey ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            Für die KI-Schätzung brauchst du einen Anthropic-API-Key.{' '}
            <Link to="/einstellungen" onClick={onClose} className="font-medium underline">
              In den Einstellungen hinterlegen →
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
              {(
                [
                  { value: 'text', label: 'Beschreiben' },
                  { value: 'photo', label: 'Foto' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setMode(opt.value);
                    setEstimate(null);
                    setError(null);
                  }}
                  className={`rounded-lg px-4 py-1.5 text-sm ${
                    mode === opt.value
                      ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
                      : 'text-slate-500'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {mode === 'text' ? (
              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                  Beschreibe dein Essen
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="z. B. Großer Teller Spaghetti Bolognese mit Parmesan, dazu ein Stück Knoblauchbrot"
                  className="min-h-[90px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                  autoFocus
                />
              </label>
            ) : (
              <div className="mb-3 space-y-2">
                {photoUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                    <img src={photoUrl} alt="Essen" className="max-h-64 w-full object-cover" />
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => cameraInput.current?.click()}
                  >
                    <Camera className="h-4 w-4" /> Foto aufnehmen
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => galleryInput.current?.click()}
                  >
                    Aus Galerie
                  </Button>
                </div>
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
                <input
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="Optionaler Hinweis, z. B. „mit Sahnesoße“"
                  aria-label="Hinweis zum Foto"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            )}

            {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}

            {!estimate ? (
              <Button onClick={run} disabled={!canRun}>
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Claude analysiert…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Nährwerte schätzen
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{estimate.name}</div>
                      {estimate.brand ? (
                        <div className="text-xs text-slate-500">{estimate.brand}</div>
                      ) : null}
                    </div>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {CONFIDENCE_LABEL[estimate.confidence]}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center text-sm tabular-nums">
                    <Cell label="kcal" value={Math.round(estimate.per100g.kcal)} />
                    <Cell label="P" value={Math.round(estimate.per100g.protein)} />
                    <Cell label="KH" value={Math.round(estimate.per100g.carbs)} />
                    <Cell label="F" value={Math.round(estimate.per100g.fat)} />
                  </div>
                  <p className="mt-1 text-center text-[10px] uppercase tracking-wide text-slate-400">
                    pro 100 g · geschätzt von Claude
                  </p>
                  {estimate.suggestedPortionG ? (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                      Vorgeschlagene Portion: <b>{estimate.suggestedPortionG} g</b>
                    </p>
                  ) : null}
                  {estimate.notes ? (
                    <p className="mt-1 text-xs italic text-slate-500">{estimate.notes}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEstimate(null)}>
                    Neu schätzen
                  </Button>
                  <Button className="flex-1" onClick={confirm}>
                    Übernehmen &amp; Menge wählen
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
