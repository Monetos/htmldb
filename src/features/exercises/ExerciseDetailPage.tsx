import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, PlayCircle, Pencil, Trash2 } from 'lucide-react';
import { db } from '../../db/database';
import { EQUIPMENT_LABELS, type MuscleGroup } from '../../db/schema';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { MuscleChip } from '../../components/MuscleChip';
import { BodyDiagram, BodyDiagramToggle } from '../../components/BodyDiagram';
import {
  type BodyView,
  hasAnyRegionForView,
  regionMembershipForView,
} from '../../lib/muscleDiagramMapping';
import { youtubeEmbedUrl } from '../../lib/youtube';
import { ExerciseTrendCharts } from '../progress/ExerciseTrendCharts';

const MEMBERSHIP_HEX = { primary: '#5b5ef2', secondary: '#c6cdff' } as const;
const EMPTY_MUSCLES: MuscleGroup[] = [];

export function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const exercise = useLiveQuery(() => (id ? db.exercises.get(id) : undefined), [id]);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [view, setView] = useState<BodyView | null>(null);

  const primaryMuscles = exercise?.primaryMuscles ?? EMPTY_MUSCLES;
  const secondaryMuscles = exercise?.secondaryMuscles ?? EMPTY_MUSCLES;

  const effectiveView: BodyView =
    view ??
    (!hasAnyRegionForView(primaryMuscles, 'front') && hasAnyRegionForView(primaryMuscles, 'back')
      ? 'back'
      : 'front');

  const regionColors = useMemo(() => {
    const membership = regionMembershipForView(primaryMuscles, secondaryMuscles, effectiveView);
    return Object.fromEntries(
      Object.entries(membership).map(([slug, level]) => [slug, MEMBERSHIP_HEX[level]]),
    );
  }, [primaryMuscles, secondaryMuscles, effectiveView]);

  if (!exercise) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8 text-center text-sm text-slate-500">
        Übung nicht gefunden.{' '}
        <Link to="/uebungen" className="text-brand-600">
          Zurück
        </Link>
      </div>
    );
  }

  const onDelete = async () => {
    if (!confirm(`„${exercise.name}" wirklich löschen?`)) return;
    await db.exercises.delete(exercise.id);
    navigate('/uebungen', { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <Link
        to="/uebungen"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>

      <header className="mb-4">
        <h1 className="text-2xl font-semibold">{exercise.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {EQUIPMENT_LABELS[exercise.equipment]}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            {exercise.category === 'compound' ? 'Grundübung' : 'Isolation'}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
            Pause: {exercise.defaultRestSeconds}s
          </span>
          {exercise.isCustom ? (
            <span className="rounded-full border border-brand-500 px-2 py-0.5 text-xs text-brand-600 dark:text-brand-400">
              Eigene
            </span>
          ) : null}
        </div>
      </header>

      <section className="mb-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Muskeln</h2>
        <div className="flex flex-col items-center gap-2">
          <BodyDiagramToggle view={effectiveView} onChange={setView} />
          <BodyDiagram
            view={effectiveView}
            regionColors={regionColors}
            title={`Trainierte Muskeln, ${effectiveView === 'front' ? 'Vorderansicht' : 'Rückansicht'}`}
            className="h-48 w-auto"
          />
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: MEMBERSHIP_HEX.primary }}
              />
              Primär
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: MEMBERSHIP_HEX.secondary }}
              />
              Sekundär
            </span>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Primär</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {exercise.primaryMuscles.map((m) => (
              <MuscleChip key={m} muscle={m} />
            ))}
          </div>
        </div>
        {exercise.secondaryMuscles.length > 0 ? (
          <div>
            <div className="text-xs text-slate-500">Sekundär</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {exercise.secondaryMuscles.map((m) => (
                <MuscleChip key={m} muscle={m} variant="secondary" />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {exercise.videoUrl ? (
        <Card as="section" className="mb-4 p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Video
          </h2>
          {videoLoaded ? (
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe
                src={youtubeEmbedUrl(exercise.videoUrl) ?? undefined}
                title={`Video: ${exercise.name}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setVideoLoaded(true)}
              className="flex aspect-video w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 text-sm text-slate-500 hover:border-brand-500 hover:text-brand-600 dark:border-slate-600 dark:text-slate-400"
            >
              <PlayCircle className="h-5 w-5" /> Video laden
            </button>
          )}
        </Card>
      ) : null}

      <Card as="section" className="mb-4 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Setup</h2>
        <p className="text-sm">{exercise.execution.setup}</p>
      </Card>

      <Card as="section" className="mb-4 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Bewegung
        </h2>
        <p className="text-sm">{exercise.execution.movement}</p>
      </Card>

      <Card as="section" className="mb-4 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Cues</h2>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {exercise.execution.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>

      <Card as="section" className="mb-4 p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Häufige Fehler
        </h2>
        <ul className="list-inside list-disc space-y-1 text-sm">
          {exercise.execution.commonMistakes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Card>

      <div className="mb-4">
        <ExerciseTrendCharts exerciseId={exercise.id} />
      </div>

      {exercise.isCustom ? (
        <div className="flex gap-2">
          <Link to={`/uebungen/${exercise.id}/bearbeiten`} className="flex-1">
            <Button variant="secondary" className="w-full">
              <Pencil className="h-4 w-4" /> Bearbeiten
            </Button>
          </Link>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Löschen
          </Button>
        </div>
      ) : null}
    </div>
  );
}
