import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { db } from '../../db/database';
import type { Food, Macros } from '../../db/schema';
import { Button } from '../../components/Button';
import { deleteFood, saveFood } from './nutritionLib';

interface FormState {
  name: string;
  brand: string;
  per100g: { kcal: string; protein: string; carbs: string; fat: string };
}

function empty(): FormState {
  return {
    name: '',
    brand: '',
    per100g: { kcal: '', protein: '', carbs: '', fat: '' },
  };
}

function num(s: string): number {
  const v = Number(s.replace(',', '.'));
  return Number.isFinite(v) ? v : 0;
}

export function FoodFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [loaded, setLoaded] = useState(!editing);
  const [customAllowed, setCustomAllowed] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || !id) return;
    let cancelled = false;
    db.foods.get(id).then((row) => {
      if (cancelled) return;
      if (!row) {
        setError('Lebensmittel nicht gefunden.');
        setLoaded(true);
        return;
      }
      setForm({
        name: row.name,
        brand: row.brand ?? '',
        per100g: {
          kcal: String(row.per100g.kcal),
          protein: String(row.per100g.protein),
          carbs: String(row.per100g.carbs),
          fat: String(row.per100g.fat),
        },
      });
      setCustomAllowed(row.isCustom);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError('Bitte einen Namen vergeben.');
      return;
    }
    const per100g: Macros = {
      kcal: num(form.per100g.kcal),
      protein: num(form.per100g.protein),
      carbs: num(form.per100g.carbs),
      fat: num(form.per100g.fat),
    };
    try {
      const saved: Food = await saveFood({
        id: editing ? id : undefined,
        name: form.name,
        brand: form.brand,
        per100g,
      });
      navigate('/ernaehrung/lebensmittel');
      void saved;
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    if (!confirm('Lebensmittel wirklich löschen?')) return;
    await deleteFood(id);
    navigate('/ernaehrung/lebensmittel');
  };

  if (!loaded) return <div className="p-6 text-sm text-slate-500">Lade…</div>;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <Link
        to="/ernaehrung/lebensmittel"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>
      <h1 className="mb-4 text-xl font-semibold">
        {editing ? 'Lebensmittel bearbeiten' : 'Neues Lebensmittel'}
      </h1>

      {editing && !customAllowed ? (
        <p className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          Hinweis: Dies ist ein Seed-Eintrag. Du kannst Werte ändern, aber er bleibt in der Bibliothek.
        </p>
      ) : null}

      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputCls}
            autoFocus={!editing}
          />
        </Field>
        <Field label="Marke (optional)">
          <input
            value={form.brand}
            onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
            className={inputCls}
          />
        </Field>

        <fieldset className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Werte pro 100 g
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              label="Kalorien (kcal)"
              value={form.per100g.kcal}
              onChange={(v) => setForm((f) => ({ ...f, per100g: { ...f.per100g, kcal: v } }))}
            />
            <NumberField
              label="Protein (g)"
              value={form.per100g.protein}
              onChange={(v) => setForm((f) => ({ ...f, per100g: { ...f.per100g, protein: v } }))}
            />
            <NumberField
              label="Kohlenhydrate (g)"
              value={form.per100g.carbs}
              onChange={(v) => setForm((f) => ({ ...f, per100g: { ...f.per100g, carbs: v } }))}
            />
            <NumberField
              label="Fett (g)"
              value={form.per100g.fat}
              onChange={(v) => setForm((f) => ({ ...f, per100g: { ...f.per100g, fat: v } }))}
            />
          </div>
        </fieldset>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {editing ? 'Speichern' : 'Anlegen'}
          </Button>
          {editing && customAllowed ? (
            <Button type="button" variant="danger" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
            Abbrechen
          </Button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        placeholder="0"
      />
    </Field>
  );
}
