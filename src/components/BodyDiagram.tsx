import {
  BODY_BACK_OUTLINE_D,
  BODY_BACK_REGIONS,
  BODY_BACK_VIEWBOX,
  BODY_FRONT_OUTLINE_D,
  BODY_FRONT_REGIONS,
  BODY_FRONT_VIEWBOX,
  type RegionSlug,
} from '../lib/bodyDiagramData';
import type { BodyView } from '../lib/muscleDiagramMapping';

interface BodyDiagramProps {
  view: BodyView;
  regionColors: Partial<Record<RegionSlug, string>>;
  title: string;
  className?: string;
}

export function BodyDiagram({ view, regionColors, title, className = '' }: BodyDiagramProps) {
  const regions = view === 'front' ? BODY_FRONT_REGIONS : BODY_BACK_REGIONS;
  const viewBox = view === 'front' ? BODY_FRONT_VIEWBOX : BODY_BACK_VIEWBOX;
  const outlineD = view === 'front' ? BODY_FRONT_OUTLINE_D : BODY_BACK_OUTLINE_D;

  return (
    <svg role="img" aria-label={title} viewBox={viewBox} className={className}>
      <path
        d={outlineD}
        className="fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-600"
        strokeWidth={2}
      />
      {regions.map((region) => {
        const fill = regionColors[region.slug];
        const paths = [
          ...(region.path.common ?? []),
          ...(region.path.left ?? []),
          ...(region.path.right ?? []),
        ];
        return paths.map((d, i) => (
          <path
            key={`${region.slug}-${i}`}
            d={d}
            fill={fill}
            className={fill ? undefined : 'fill-slate-200 dark:fill-slate-700'}
          />
        ));
      })}
    </svg>
  );
}

const VIEW_OPTIONS: { value: BodyView; label: string }[] = [
  { value: 'front', label: 'Vorne' },
  { value: 'back', label: 'Hinten' },
];

export function BodyDiagramToggle({
  view,
  onChange,
}: {
  view: BodyView;
  onChange: (view: BodyView) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-lg px-2 py-1 text-xs ${
            view === option.value
              ? 'bg-white text-slate-800 shadow dark:bg-slate-900 dark:text-slate-100'
              : 'text-slate-500'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
