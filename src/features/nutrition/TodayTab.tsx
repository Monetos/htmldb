import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { DailyTargets, Food, FoodLogEntry, MealType, WaterLogEntry } from '../../db/schema';
import { DEFAULT_DAILY_TARGETS } from '../../db/schema';
import { Button } from '../../components/Button';
import { dayAnchor, deleteFoodLogEntry, macrosForAmount, totalsFromEntries } from './nutritionLib';
import { FoodPickerModal } from './FoodPickerModal';
import { MacroRings } from './MacroRings';
import { WaterTracker } from './WaterTracker';

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
};

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

const EMPTY_ENTRIES: FoodLogEntry[] = [];
const EMPTY_WATER: WaterLogEntry[] = [];
const EMPTY_FOODS: Food[] = [];

export function TodayTab() {
  const now = Date.now();
  const anchor = useMemo(() => dayAnchor(now), [now]);
  const [picker, setPicker] = useState<MealType | null>(null);

  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const targets: DailyTargets = settings?.dailyTargets ?? DEFAULT_DAILY_TARGETS;

  const entriesQuery = useLiveQuery(
    () => db.foodLog.where('date').equals(anchor).sortBy('loggedAt'),
    [anchor],
  );
  const entries = entriesQuery ?? EMPTY_ENTRIES;
  const waterQuery = useLiveQuery(() => db.waterLog.where('date').equals(anchor).toArray(), [anchor]);
  const water = waterQuery ?? EMPTY_WATER;

  const foodIds = useMemo(
    () => Array.from(new Set(entries.map((e) => e.foodId))),
    [entries],
  );
  const foodsQuery = useLiveQuery(
    async () => {
      if (foodIds.length === 0) return EMPTY_FOODS;
      const rows = await db.foods.bulkGet(foodIds);
      return rows.filter((f): f is Food => Boolean(f));
    },
    [foodIds.join(',')],
  );
  const foodsById = useMemo(() => {
    const m = new Map<string, Food>();
    for (const f of foodsQuery ?? []) m.set(f.id, f);
    return m;
  }, [foodsQuery]);

  const totals = useMemo(
    () => totalsFromEntries(entries, foodsById, water),
    [entries, foodsById, water],
  );

  const entriesByMeal = useMemo(() => {
    const map: Record<MealType, FoodLogEntry[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const e of entries) map[e.mealType].push(e);
    return map;
  }, [entries]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800/40">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {new Date(anchor).toLocaleDateString('de-DE', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
            })}
          </h2>
          <Link to="/einstellungen" className="text-xs text-brand-600 hover:underline dark:text-brand-400">
            Ziele anpassen
          </Link>
        </div>
        <MacroRings macros={totals.macros} targets={targets} />
      </section>

      <WaterTracker date={now} targetMl={targets.waterMl} />

      {MEAL_ORDER.map((meal) => (
        <MealSection
          key={meal}
          meal={meal}
          entries={entriesByMeal[meal]}
          foodsById={foodsById}
          onAdd={() => setPicker(meal)}
        />
      ))}

      {picker ? (
        <FoodPickerModal
          open
          mealType={picker}
          date={now}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </div>
  );
}

function MealSection({
  meal,
  entries,
  foodsById,
  onAdd,
}: {
  meal: MealType;
  entries: FoodLogEntry[];
  foodsById: Map<string, Food>;
  onAdd: () => void;
}) {
  const subtotal = useMemo(() => {
    let kcal = 0;
    let protein = 0;
    for (const e of entries) {
      const f = foodsById.get(e.foodId);
      if (!f) continue;
      const m = macrosForAmount(f.per100g, e.amountG);
      kcal += m.kcal;
      protein += m.protein;
    }
    return { kcal, protein };
  }, [entries, foodsById]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/40">
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-700/60">
        <div>
          <h2 className="text-sm font-semibold">{MEAL_LABELS[meal]}</h2>
          {entries.length > 0 ? (
            <p className="text-xs text-slate-500 tabular-nums">
              {Math.round(subtotal.kcal)} kcal · {Math.round(subtotal.protein)}g P
            </p>
          ) : null}
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4" /> Hinzufügen
        </Button>
      </header>
      {entries.length === 0 ? (
        <p className="px-3 py-3 text-xs text-slate-500">Noch nichts eingetragen.</p>
      ) : (
        <ul>
          {entries.map((e) => {
            const food = foodsById.get(e.foodId);
            if (!food) return null;
            const macros = macrosForAmount(food.per100g, e.amountG);
            return (
              <li
                key={e.id}
                className="flex items-center justify-between border-t border-slate-100 px-3 py-2 first:border-t-0 dark:border-slate-700/60"
              >
                <div>
                  <div className="text-sm font-medium">{food.name}</div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {e.amountG} g · {Math.round(macros.kcal)} kcal · {Math.round(macros.protein)}g P
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Eintrag löschen"
                  onClick={() => deleteFoodLogEntry(e.id)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
