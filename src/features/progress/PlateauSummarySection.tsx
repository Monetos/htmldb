import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { TrendingDown } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { actionablePlateaus, computeAllExercisePlateaus, dismissPlateau } from './plateauLib';

/** Aggregate discovery view — omits itself entirely when nothing qualifies, no "everything is fine!" clutter. */
export function PlateauSummarySection() {
  const entries = useLiveQuery(() => computeAllExercisePlateaus(Date.now()), []);
  const actionable = entries ? actionablePlateaus(entries) : [];

  if (actionable.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Stagnierende Übungen
      </h2>
      <ul className="space-y-2">
        {actionable.map((entry) => (
          <Card as="li" key={entry.exerciseId}>
            <div className="flex items-center justify-between gap-2">
              <Link to={`/uebungen/${entry.exerciseId}`} className="flex-1">
                <div className="flex items-center gap-2 font-medium">
                  {entry.plateauResult.status === 'regressing' ? (
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  ) : null}
                  {entry.exerciseName}
                </div>
                <div className="text-xs text-slate-500">
                  {entry.plateauResult.status === 'regressing' ? 'Kraftwerte gesunken' : 'Stagniert'}
                </div>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => void dismissPlateau(entry.exerciseId)}>
                Verwerfen
              </Button>
            </div>
          </Card>
        ))}
      </ul>
    </section>
  );
}
