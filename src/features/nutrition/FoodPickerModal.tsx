import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanBarcode, Search, Sparkles, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import type { Food, MealType } from '../../db/schema';
import { Button } from '../../components/Button';
import { Modal } from '../../components/Modal';
import { cardClassName } from '../../lib/cardStyles';
import { lastAmountForFood, logFood, macrosForAmount, recentFoods } from './nutritionLib';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { AiFoodModal } from './AiFoodModal';

const EMPTY_FOODS: Food[] = [];
const QUICK_AMOUNTS = [50, 100, 150, 200];

interface Props {
  open: boolean;
  mealType: MealType;
  date: number;
  onClose: () => void;
  onLogged?: () => void;
}

export function FoodPickerModal({ open, mealType, date, onClose, onLogged }: Props) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [amount, setAmount] = useState<string>('100');
  const [showScanner, setShowScanner] = useState(false);
  const [showAi, setShowAi] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setPicked(null);
      setAmount('100');
      setShowScanner(false);
      setShowAi(false);
    }
  }, [open]);

  // Prefill the amount with the last logged amount for this food, so repeat
  // entries take one tap instead of retyping the usual portion.
  const pickFood = async (food: Food, presetAmount?: number) => {
    if (presetAmount && presetAmount > 0) {
      setAmount(String(Math.round(presetAmount)));
    } else {
      const last = await lastAmountForFood(food.id);
      setAmount(last && last > 0 ? String(Math.round(last)) : '100');
    }
    setPicked(food);
  };

  const foodsQuery = useLiveQuery(() => db.foods.orderBy('name').toArray(), [], EMPTY_FOODS);
  const foods = foodsQuery ?? EMPTY_FOODS;
  const recents = useLiveQuery(() => recentFoods(10), [], [] as Food[]) ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter(
      (f) => f.name.toLowerCase().includes(q) || f.brand?.toLowerCase().includes(q),
    );
  }, [foods, search]);

  const amountNum = useMemo(() => {
    const v = Number(amount.replace(',', '.'));
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [amount]);

  const preview = picked && amountNum > 0 ? macrosForAmount(picked.per100g, amountNum) : null;

  const confirm = async () => {
    if (!picked || amountNum <= 0) return;
    await logFood({ foodId: picked.id, amountG: amountNum, mealType, date });
    onLogged?.();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Lebensmittel hinzufügen" size="fill">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {picked ? picked.name : 'Lebensmittel auswählen'}
        </h2>
        <button
          type="button"
          aria-label="Schließen"
          onClick={onClose}
          className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {picked ? (
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-xs text-slate-500">
            Pro 100 g: {Math.round(picked.per100g.kcal)} kcal · {picked.per100g.protein}g P ·{' '}
            {picked.per100g.carbs}g KH · {picked.per100g.fat}g F
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Menge (g)
            </span>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-semibold tabular-nums dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q))}
                className="rounded-xl border border-slate-200 px-3 py-1 text-sm hover:border-brand-500 dark:border-slate-700"
              >
                {q} g
              </button>
            ))}
          </div>
          {preview ? (
            <div className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
              <div className="text-xs uppercase tracking-wide text-slate-500">Wird hinzugefügt</div>
              <div className="mt-1 grid grid-cols-4 gap-2 text-center tabular-nums">
                <PreviewCell label="kcal" value={Math.round(preview.kcal)} />
                <PreviewCell label="P" value={Math.round(preview.protein)} />
                <PreviewCell label="KH" value={Math.round(preview.carbs)} />
                <PreviewCell label="F" value={Math.round(preview.fat)} />
              </div>
            </div>
          ) : null}

          <div className="mt-auto flex gap-2">
            <Button variant="ghost" onClick={() => setPicked(null)}>
              Zurück
            </Button>
            <Button onClick={confirm} disabled={amountNum <= 0} className="flex-1">
              Hinzufügen
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowScanner(true)}>
              <ScanBarcode className="h-4 w-4" /> Barcode
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowAi(true)}>
              <Sparkles className="h-4 w-4" /> KI-Schätzung
            </Button>
          </div>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suche…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          {recents.length > 0 && search.trim() === '' ? (
            <section className="mb-3">
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Zuletzt verwendet
              </h3>
              <div className="flex flex-wrap gap-1">
                {recents.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => void pickFood(f)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs hover:border-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <ul className="flex-1 space-y-1 overflow-y-auto">
            {filtered.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => void pickFood(f)}
                  className={cardClassName({
                    interactive: true,
                    className: 'flex w-full items-center justify-between px-3 py-2 text-left',
                  })}
                >
                  <div>
                    <div className="text-sm font-medium">{f.name}</div>
                    {f.brand ? (
                      <div className="text-xs text-slate-500">{f.brand}</div>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-slate-500 tabular-nums">
                    <div>{Math.round(f.per100g.kcal)} kcal</div>
                    <div>{f.per100g.protein}g P / 100g</div>
                  </div>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="py-6 text-center text-sm text-slate-500">
                Nichts gefunden.{' '}
                <Link
                  to="/ernaehrung/lebensmittel/neu"
                  onClick={onClose}
                  className="text-brand-600 hover:underline"
                >
                  Neu anlegen
                </Link>
              </li>
            ) : null}
          </ul>
        </>
      )}

      <BarcodeScannerModal
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onFoodReady={(food) => {
          setShowScanner(false);
          void pickFood(food);
        }}
      />
      <AiFoodModal
        open={showAi}
        onClose={() => setShowAi(false)}
        onFoodReady={(food, portion) => {
          setShowAi(false);
          void pickFood(food, portion);
        }}
      />
    </Modal>
  );
}

function PreviewCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
