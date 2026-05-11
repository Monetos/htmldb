import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Download, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  BackupParseError,
  backupFilename,
  exportBackup,
  parseBackup,
  restoreBackup,
} from '../../db/backup';
import { db, ensureSettings } from '../../db/database';
import type { DailyTargets } from '../../db/schema';
import { Button } from '../../components/Button';
import { AppHeader } from '../../components/AppHeader';

export function SettingsPage() {
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'error'; message: string }>({
    kind: 'idle',
    message: '',
  });
  const fileInput = useRef<HTMLInputElement>(null);

  const onExport = async () => {
    try {
      const payload = await exportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFilename();
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ kind: 'ok', message: 'Backup heruntergeladen.' });
    } catch (e) {
      setStatus({ kind: 'error', message: `Export fehlgeschlagen: ${(e as Error).message}` });
    }
  };

  const onImportFile = async (file: File) => {
    if (!confirm('Achtung: Der Import überschreibt alle aktuellen Daten. Fortfahren?')) {
      return;
    }
    try {
      const text = await file.text();
      const payload = parseBackup(text);
      const summary = await restoreBackup(payload);
      const total = Object.values(summary).reduce((a, b) => a + b, 0);
      setStatus({
        kind: 'ok',
        message: `Import erfolgreich: ${total} Einträge wiederhergestellt.`,
      });
    } catch (e) {
      const msg =
        e instanceof BackupParseError ? e.message : `Import fehlgeschlagen: ${(e as Error).message}`;
      setStatus({ kind: 'error', message: msg });
    }
  };

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader title="Einstellungen" />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 px-4 pb-24 pt-4">
        <Link
          to="/training"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Link>

        <DailyTargetsCard />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Backup
          </h2>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Exportiere alle Daten als JSON-Datei. Lege die Datei regelmäßig in einen
            Cloud-Ordner – IndexedDB ist robust, aber ein versehentliches „App-Daten löschen"
            ist sonst Endgame. Hinweis: Fotos werden derzeit nicht im JSON-Backup gespeichert.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={onExport}>
              <Download className="h-4 w-4" /> Backup exportieren
            </Button>
            <Button variant="secondary" onClick={() => fileInput.current?.click()}>
              <Upload className="h-4 w-4" /> Backup importieren
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onImportFile(f);
                e.target.value = '';
              }}
            />
          </div>
          {status.kind !== 'idle' ? (
            <p
              role="status"
              className={`mt-3 text-sm ${
                status.kind === 'ok' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {status.message}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function DailyTargetsCard() {
  const [targets, setTargets] = useState<DailyTargets | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    ensureSettings().then((s) => {
      if (!cancelled) setTargets(s.dailyTargets);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (key: keyof DailyTargets, value: string) => {
    const v = Number(value.replace(',', '.'));
    setTargets((t) => (t ? { ...t, [key]: Number.isFinite(v) ? v : 0 } : t));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!targets) return;
    await db.settings.update('singleton', { dailyTargets: targets, updatedAt: Date.now() });
    setSavedAt(Date.now());
  };

  if (!targets) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <p className="text-sm text-slate-500">Lade Tagesziele…</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/40">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Tagesziele
      </h2>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        Bezugspunkt für die Makro-Ringe im Ernährungs-Tab.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <TargetField label="Kalorien (kcal)" value={targets.kcal} onChange={(v) => update('kcal', v)} />
          <TargetField label="Protein (g)" value={targets.proteinG} onChange={(v) => update('proteinG', v)} />
          <TargetField label="Kohlenhydrate (g)" value={targets.carbsG} onChange={(v) => update('carbsG', v)} />
          <TargetField label="Fett (g)" value={targets.fatG} onChange={(v) => update('fatG', v)} />
          <TargetField label="Wasser (ml)" value={targets.waterMl} onChange={(v) => update('waterMl', v)} />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit">Speichern</Button>
          {savedAt ? <span className="text-xs text-emerald-600">Gespeichert.</span> : null}
        </div>
      </form>
    </section>
  );
}

function TargetField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
      />
    </label>
  );
}
