import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { BodyMetric } from '../../db/schema';
import { Button } from '../../components/Button';
import { deleteBodyMetric } from './bodyLib';
import { BodyTrendCharts } from './BodyTrendCharts';

const EMPTY: BodyMetric[] = [];

export function BodyHistoryTab() {
  const metricsQuery = useLiveQuery(() => db.bodyMetrics.orderBy('date').reverse().toArray(), []);
  const metrics = metricsQuery ?? EMPTY;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {metrics.length} {metrics.length === 1 ? 'Eintrag' : 'Einträge'}
        </p>
        <Link to="/koerper/messung/neu">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Neue Messung
          </Button>
        </Link>
      </div>

      <BodyTrendCharts metrics={metrics} />

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Einträge
        </h2>
        {metrics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
            Noch keine Körperdaten erfasst.
          </div>
        ) : (
          <ul className="space-y-2">
            {metrics.map((m) => (
              <li
                key={m.id}
                className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">
                      {new Date(m.date).toLocaleDateString('de-DE', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </div>
                    <MetricSummary metric={m} />
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/koerper/messung/${m.id}/bearbeiten`}
                      aria-label="Bearbeiten"
                      className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      aria-label="Löschen"
                      onClick={async () => {
                        if (!confirm('Eintrag wirklich löschen?')) return;
                        await deleteBodyMetric(m.id);
                      }}
                      className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {m.notes ? (
                  <p className="mt-2 text-xs text-slate-500">„{m.notes}"</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricSummary({ metric }: { metric: BodyMetric }) {
  const bits: string[] = [];
  if (metric.weightKg !== undefined) bits.push(`${metric.weightKg} kg`);
  if (metric.bodyFatPercent !== undefined) bits.push(`${metric.bodyFatPercent}% KFA`);
  if (metric.measurements) {
    if (metric.measurements.waistCm !== undefined) bits.push(`Taille ${metric.measurements.waistCm} cm`);
    if (metric.measurements.chestCm !== undefined) bits.push(`Brust ${metric.measurements.chestCm} cm`);
  }
  if (bits.length === 0) return <p className="text-xs text-slate-400">– keine Werte –</p>;
  return <p className="mt-1 text-xs text-slate-500">{bits.join(' · ')}</p>;
}
