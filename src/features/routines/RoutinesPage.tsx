import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { Routine } from '../../db/schema';
import { AppHeader } from '../../components/AppHeader';
import { Button } from '../../components/Button';
import { lastPerformedMap } from './routinesLib';

const EMPTY_ROUTINES: Routine[] = [];

export function RoutinesPage() {
  const routinesQuery = useLiveQuery(() => db.routines.orderBy('name').toArray(), []);
  const routines = routinesQuery ?? EMPTY_ROUTINES;

  const ids = useMemo(() => routines.map((r) => r.id), [routines]);
  const last = useLiveQuery(() => lastPerformedMap(ids), [ids.join(',')]);

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Routinen" />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 pb-24 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {routines.length} {routines.length === 1 ? 'Routine' : 'Routinen'}
          </p>
          <Link to="/routinen/neu">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Neue Routine
            </Button>
          </Link>
        </div>

        {routines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Du hast noch keine Routinen.
            <div className="mt-3">
              <Link to="/routinen/neu" className="text-brand-600 hover:underline">
                Erste Routine anlegen →
              </Link>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {routines.map((r) => {
              const lastTs = last?.get(r.id);
              return (
                <li key={r.id}>
                  <Link
                    to={`/routinen/${r.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-500"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{r.name}</div>
                        {r.description ? (
                          <div className="mt-1 text-xs text-slate-500">{r.description}</div>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {r.exercises.length}{' '}
                        {r.exercises.length === 1 ? 'Übung' : 'Übungen'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Zuletzt: {lastTs ? new Date(lastTs).toLocaleDateString('de-DE') : '–'}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
