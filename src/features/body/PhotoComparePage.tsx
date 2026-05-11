import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { PhotoView, ProgressPhoto } from '../../db/schema';
import { usePhotoUrl } from './usePhotoUrl';

const EMPTY: ProgressPhoto[] = [];

const VIEW_OPTIONS: { value: PhotoView; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Seite' },
  { value: 'back', label: 'Rücken' },
];

export function PhotoComparePage() {
  const [view, setView] = useState<PhotoView>('front');
  const photosQuery = useLiveQuery(() => db.progressPhotos.orderBy('date').toArray(), []);
  const photos = photosQuery ?? EMPTY;

  const photosForView = useMemo(() => photos.filter((p) => p.view === view), [photos, view]);

  // Default selection: oldest for "left", newest for "right".
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  useEffect(() => {
    if (photosForView.length === 0) {
      setLeftId(null);
      setRightId(null);
      return;
    }
    setLeftId((current) =>
      current && photosForView.some((p) => p.id === current)
        ? current
        : photosForView[0].id,
    );
    setRightId((current) =>
      current && photosForView.some((p) => p.id === current)
        ? current
        : photosForView[photosForView.length - 1].id,
    );
  }, [photosForView]);

  const left = photosForView.find((p) => p.id === leftId) ?? null;
  const right = photosForView.find((p) => p.id === rightId) ?? null;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <Link
        to="/koerper/fotos"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>
      <h1 className="mb-4 text-xl font-semibold">Vergleichen</h1>

      <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
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

      {photosForView.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
          Du brauchst mindestens zwei Fotos in dieser Ansicht.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <ComparePane
            label="Vorher"
            photos={photosForView}
            selectedId={leftId}
            onChange={setLeftId}
          />
          <ComparePane
            label="Nachher"
            photos={photosForView}
            selectedId={rightId}
            onChange={setRightId}
          />
        </div>
      )}

      {left && right && left.id !== right.id ? (
        <p className="mt-3 text-center text-xs text-slate-500">
          Abstand: {Math.round(Math.abs(right.date - left.date) / (24 * 60 * 60 * 1000))} Tage
        </p>
      ) : null}
    </div>
  );
}

function ComparePane({
  label,
  photos,
  selectedId,
  onChange,
}: {
  label: string;
  photos: ProgressPhoto[];
  selectedId: string | null;
  onChange: (id: string) => void;
}) {
  const photo = photos.find((p) => p.id === selectedId);
  const url = usePhotoUrl(photo?.imageBlob);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        {photo ? (
          <span className="text-xs text-slate-500">
            {new Date(photo.date).toLocaleDateString('de-DE')}
          </span>
        ) : null}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
        {url ? (
          <img src={url} alt={label} className="aspect-[3/4] w-full object-cover" />
        ) : (
          <div className="aspect-[3/4] w-full" />
        )}
      </div>
      <select
        aria-label={`${label} auswählen`}
        value={selectedId ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
      >
        {photos.map((p) => (
          <option key={p.id} value={p.id}>
            {new Date(p.date).toLocaleDateString('de-DE')}
          </option>
        ))}
      </select>
    </div>
  );
}
