import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { Food } from '../../db/schema';
import { Button } from '../../components/Button';

const EMPTY: Food[] = [];

export function FoodsTab() {
  const [search, setSearch] = useState('');
  const [onlyCustom, setOnlyCustom] = useState(false);

  const foodsQuery = useLiveQuery(() => db.foods.orderBy('name').toArray(), []);
  const foods = foodsQuery ?? EMPTY;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foods.filter((f) => {
      if (onlyCustom && !f.isCustom) return false;
      if (q && !f.name.toLowerCase().includes(q) && !f.brand?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [foods, search, onlyCustom]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {filtered.length} von {foods.length} Lebensmitteln
        </p>
        <Link to="/ernaehrung/lebensmittel/neu">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Neu
          </Button>
        </Link>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Suche…"
          aria-label="Lebensmittel suchen"
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <input
          type="checkbox"
          checked={onlyCustom}
          onChange={(e) => setOnlyCustom(e.target.checked)}
          className="h-4 w-4"
        />
        Nur eigene
      </label>
      <ul className="space-y-2">
        {filtered.map((f) => (
          <li key={f.id}>
            <Link
              to={`/ernaehrung/lebensmittel/${f.id}/bearbeiten`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-brand-500"
            >
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {f.name}
                  {f.isCustom ? (
                    <span className="rounded-full border border-brand-500 px-2 py-0.5 text-[10px] uppercase text-brand-600 dark:text-brand-400">
                      Eigene
                    </span>
                  ) : null}
                </div>
                {f.brand ? <div className="text-xs text-slate-500">{f.brand}</div> : null}
              </div>
              <div className="text-right text-xs text-slate-500 tabular-nums">
                <div>{Math.round(f.per100g.kcal)} kcal / 100g</div>
                <div>{f.per100g.protein}g P / {f.per100g.carbs}g KH / {f.per100g.fat}g F</div>
              </div>
            </Link>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
            Nichts gefunden.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
