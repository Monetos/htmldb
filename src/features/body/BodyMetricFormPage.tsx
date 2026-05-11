import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { db } from '../../db/database';
import type { BodyMeasurements } from '../../db/schema';
import { Button } from '../../components/Button';
import { saveBodyMetric } from './bodyLib';

interface Form {
  dateInput: string; // YYYY-MM-DD
  weightKg: string;
  bodyFatPercent: string;
  notes: string;
  measurements: Record<keyof BodyMeasurements, string>;
}

const MEASUREMENT_LABELS: Record<keyof BodyMeasurements, string> = {
  chestCm: 'Brust',
  waistCm: 'Taille',
  hipsCm: 'Hüfte',
  bicepLeftCm: 'Oberarm L',
  bicepRightCm: 'Oberarm R',
  thighLeftCm: 'Oberschenkel L',
  thighRightCm: 'Oberschenkel R',
  calfLeftCm: 'Wade L',
  calfRightCm: 'Wade R',
};

const MEASUREMENT_KEYS = Object.keys(MEASUREMENT_LABELS) as (keyof BodyMeasurements)[];

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function emptyForm(): Form {
  return {
    dateInput: todayIso(),
    weightKg: '',
    bodyFatPercent: '',
    notes: '',
    measurements: Object.fromEntries(MEASUREMENT_KEYS.map((k) => [k, ''])) as Form['measurements'],
  };
}

function parseDateIso(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12).getTime();
}

function isoFromTs(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function num(s: string): number | undefined {
  if (s.trim() === '') return undefined;
  const v = Number(s.replace(',', '.'));
  return Number.isFinite(v) ? v : undefined;
}

export function BodyMetricFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>(emptyForm);
  const [loaded, setLoaded] = useState(!editing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing || !id) return;
    let cancelled = false;
    db.bodyMetrics.get(id).then((row) => {
      if (cancelled) return;
      if (!row) {
        setError('Eintrag nicht gefunden.');
        setLoaded(true);
        return;
      }
      setForm({
        dateInput: isoFromTs(row.date),
        weightKg: row.weightKg !== undefined ? String(row.weightKg) : '',
        bodyFatPercent: row.bodyFatPercent !== undefined ? String(row.bodyFatPercent) : '',
        notes: row.notes ?? '',
        measurements: Object.fromEntries(
          MEASUREMENT_KEYS.map((k) => [k, row.measurements?.[k] !== undefined ? String(row.measurements![k]) : '']),
        ) as Form['measurements'],
      });
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  const updateMeasure = (key: keyof BodyMeasurements, value: string) => {
    setForm((f) => ({ ...f, measurements: { ...f.measurements, [key]: value } }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const date = parseDateIso(form.dateInput);
    if (!Number.isFinite(date)) {
      setError('Bitte ein gültiges Datum.');
      return;
    }
    const measurements: BodyMeasurements = {};
    for (const k of MEASUREMENT_KEYS) {
      const v = num(form.measurements[k]);
      if (v !== undefined) measurements[k] = v;
    }
    await saveBodyMetric({
      id: editing ? id : undefined,
      date,
      weightKg: num(form.weightKg),
      bodyFatPercent: num(form.bodyFatPercent),
      measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
      notes: form.notes,
    });
    navigate('/koerper/verlauf');
  };

  if (!loaded) return <div className="p-6 text-sm text-slate-500">Lade…</div>;

  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-24 pt-4">
      <Link
        to="/koerper/verlauf"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>
      <h1 className="mb-4 text-xl font-semibold">{editing ? 'Eintrag bearbeiten' : 'Neue Messung'}</h1>

      <form onSubmit={submit} className="space-y-4">
        <Field label="Datum">
          <input
            type="date"
            value={form.dateInput}
            onChange={(e) => setForm((f) => ({ ...f, dateInput: e.target.value }))}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Gewicht (kg)">
            <input
              inputMode="decimal"
              value={form.weightKg}
              onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
              placeholder="z. B. 80.5"
              className={inputCls}
            />
          </Field>
          <Field label="Körperfett (%)">
            <input
              inputMode="decimal"
              value={form.bodyFatPercent}
              onChange={(e) => setForm((f) => ({ ...f, bodyFatPercent: e.target.value }))}
              placeholder="z. B. 15.5"
              className={inputCls}
            />
          </Field>
        </div>

        <fieldset className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            Maße (cm)
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {MEASUREMENT_KEYS.map((k) => (
              <Field key={k} label={MEASUREMENT_LABELS[k]}>
                <input
                  inputMode="decimal"
                  value={form.measurements[k]}
                  onChange={(e) => updateMeasure(k, e.target.value)}
                  placeholder="–"
                  className={inputCls}
                />
              </Field>
            ))}
          </div>
        </fieldset>

        <Field label="Notizen">
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className={`${inputCls} min-h-[80px]`}
          />
        </Field>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {editing ? 'Speichern' : 'Anlegen'}
          </Button>
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
