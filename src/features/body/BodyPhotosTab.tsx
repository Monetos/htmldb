import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Plus, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { PhotoView, ProgressPhoto } from '../../db/schema';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { deletePhoto } from './bodyLib';
import { usePhotoUrl } from './usePhotoUrl';

const EMPTY: ProgressPhoto[] = [];

const VIEW_LABELS: Record<PhotoView, string> = {
  front: 'Front',
  side: 'Seite',
  back: 'Rücken',
};

const VIEW_ORDER: PhotoView[] = ['front', 'side', 'back'];

export function BodyPhotosTab() {
  const photosQuery = useLiveQuery(() => db.progressPhotos.orderBy('date').reverse().toArray(), []);
  const photos = photosQuery ?? EMPTY;

  const grouped = useMemo(() => {
    const map: Record<PhotoView, ProgressPhoto[]> = { front: [], side: [], back: [] };
    for (const p of photos) map[p.view].push(p);
    return map;
  }, [photos]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {photos.length} {photos.length === 1 ? 'Foto' : 'Fotos'}
        </p>
        <div className="flex gap-2">
          <Link to="/koerper/foto/vergleich">
            <Button size="sm" variant="secondary">
              <ArrowLeftRight className="h-4 w-4" /> Vergleichen
            </Button>
          </Link>
          <Link to="/koerper/foto/neu">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Neues Foto
            </Button>
          </Link>
        </div>
      </div>

      {photos.length === 0 ? (
        <Card className="border-dashed p-6 text-center text-sm text-slate-500">
          Noch keine Fortschrittsfotos.
        </Card>
      ) : (
        VIEW_ORDER.map((view) =>
          grouped[view].length > 0 ? (
            <section key={view}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {VIEW_LABELS[view]} · {grouped[view].length}
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {grouped[view].map((p) => (
                  <PhotoThumb key={p.id} photo={p} />
                ))}
              </div>
            </section>
          ) : null,
        )
      )}
    </div>
  );
}

function PhotoThumb({ photo }: { photo: ProgressPhoto }) {
  const url = usePhotoUrl(photo.imageBlob);
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
      {url ? (
        <img
          src={url}
          alt={`${VIEW_LABELS[photo.view]} ${new Date(photo.date).toLocaleDateString('de-DE')}`}
          className="aspect-square w-full object-cover"
        />
      ) : (
        <div className="aspect-square w-full" />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-2 py-1 text-xs text-white">
        <span>{new Date(photo.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
        <button
          type="button"
          aria-label="Foto löschen"
          onClick={async () => {
            if (!confirm('Foto wirklich löschen?')) return;
            await deletePhoto(photo.id);
          }}
          className="rounded-full p-1 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
