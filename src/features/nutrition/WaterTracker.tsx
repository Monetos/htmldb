import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { GlassWater } from 'lucide-react';
import { db } from '../../db/database';
import type { WaterLogEntry } from '../../db/schema';
import { Button } from '../../components/Button';
import { dayAnchor, logWater, deleteWaterEntry } from './nutritionLib';

const EMPTY: WaterLogEntry[] = [];

interface Props {
  date: number;
  targetMl: number;
}

const QUICK_AMOUNTS = [200, 300, 500];

export function WaterTracker({ date, targetMl }: Props) {
  const anchor = useMemo(() => dayAnchor(date), [date]);
  const entriesQuery = useLiveQuery(
    () => db.waterLog.where('date').equals(anchor).reverse().sortBy('loggedAt'),
    [anchor],
  );
  const entries = entriesQuery ?? EMPTY;

  const total = useMemo(() => entries.reduce((acc, e) => acc + e.amountMl, 0), [entries]);
  const ratio = targetMl > 0 ? Math.min(1, total / targetMl) : 0;
  const [customMl, setCustomMl] = useState('150');

  const add = async (ml: number) => {
    if (ml <= 0) return;
    await logWater(ml, date);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <GlassWater className="h-4 w-4" /> Wasser
        </h2>
        <span className="text-sm tabular-nums">
          {total} / {targetMl} ml
        </span>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900/50">
        <div
          aria-label="Wasserfortschritt"
          className="h-full bg-sky-500 transition-[width] duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((ml) => (
          <Button key={ml} size="sm" variant="secondary" onClick={() => add(ml)}>
            +{ml} ml
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <input
            inputMode="numeric"
            value={customMl}
            onChange={(e) => setCustomMl(e.target.value)}
            aria-label="Eigene Menge in ml"
            className="w-20 rounded-xl border border-slate-200 bg-white px-2 py-1 text-sm tabular-nums dark:border-slate-700 dark:bg-slate-800"
          />
          <Button
            size="sm"
            onClick={() => {
              const v = Number(customMl);
              if (Number.isFinite(v) && v > 0) {
                void add(v);
                setCustomMl('');
              }
            }}
          >
            +
          </Button>
        </div>
      </div>
      {entries.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-slate-500">
          {entries.slice(0, 6).map((e) => (
            <li key={e.id} className="flex items-center justify-between">
              <span>
                +{e.amountMl} ml ·{' '}
                {new Date(e.loggedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button
                type="button"
                onClick={() => deleteWaterEntry(e.id)}
                className="text-slate-400 hover:text-rose-600"
                aria-label="Wasser-Eintrag löschen"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
