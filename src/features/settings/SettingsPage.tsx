import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowLeft, Download, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BackupParseError,
  backupFilename,
  exportBackup,
  parseBackup,
  restoreBackup,
} from '../../db/backup';
import { db, ensureSettings } from '../../db/database';
import type { DailyTargets, WeightUnit } from '../../db/schema';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { AppHeader } from '../../components/AppHeader';
import { describeBackupAge } from './backupAge';
import { useAppUpdate, type UpdateCheckStatus } from '../../store/appUpdate';
import { useWeightUnit } from '../../hooks/useWeightUnit';

export function SettingsPage() {
  const [status, setStatus] = useState<{ kind: 'idle' | 'ok' | 'error'; message: string }>({
    kind: 'idle',
    message: '',
  });
  const fileInput = useRef<HTMLInputElement>(null);

  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const backupAge = describeBackupAge(settings?.lastBackupAt, Date.now());

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
      await db.settings.update('singleton', { lastBackupAt: Date.now(), updatedAt: Date.now() });
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

        <WeightUnitCard />

        <AiKeyCard />

        <Card as="section" className="p-4">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Backup
          </h2>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
            Exportiere alle Daten als JSON-Datei. Lege die Datei regelmäßig in einen
            Cloud-Ordner – IndexedDB ist robust, aber ein versehentliches „App-Daten löschen"
            ist sonst Endgame. Hinweis: Fotos werden derzeit nicht im JSON-Backup gespeichert.
          </p>
          <p
            role="status"
            className={`mb-3 inline-flex items-center gap-1 text-xs ${
              backupAge.warn ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500'
            }`}
          >
            {backupAge.warn ? <AlertTriangle className="h-3 w-3" /> : null}
            Letztes Backup: {backupAge.text}
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
        </Card>

        <UpdateCheckCard />
      </main>
    </div>
  );
}

const UPDATE_STATUS_TEXT: Partial<Record<UpdateCheckStatus, string>> = {
  checking: 'Suche…',
  'up-to-date': 'Du hast bereits die neueste Version.',
  'update-found':
    'Eine neue Version wurde gefunden — bestätige den Hinweis am unteren Bildschirmrand, um zu aktualisieren.',
  unsupported: 'Updates können auf diesem Gerät derzeit nicht geprüft werden.',
  error: 'Prüfung fehlgeschlagen. Bitte später erneut versuchen.',
};

function UpdateCheckCard() {
  const checkStatus = useAppUpdate((s) => s.checkStatus);
  const checkForUpdates = useAppUpdate((s) => s.checkForUpdates);

  return (
    <Card as="section" className="p-4">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        App-Updates
      </h2>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        Neue Versionen werden automatisch erkannt, sobald du die App wieder öffnest. Du kannst
        auch manuell prüfen.
      </p>
      <Button onClick={() => void checkForUpdates()} disabled={checkStatus === 'checking'}>
        Nach Updates suchen
      </Button>
      {UPDATE_STATUS_TEXT[checkStatus] ? (
        <p role="status" className="mt-3 text-sm text-slate-500">
          {UPDATE_STATUS_TEXT[checkStatus]}
        </p>
      ) : null}
    </Card>
  );
}

function AiKeyCard() {
  const [key, setKey] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureSettings().then((s) => {
      if (cancelled) return;
      setKey(s.anthropicApiKey ?? '');
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await db.settings.update('singleton', {
      anthropicApiKey: key.trim() || undefined,
      updatedAt: Date.now(),
    });
    setSavedAt(Date.now());
  };

  return (
    <Card as="section" className="p-4">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        KI-Funktionen (Claude)
      </h2>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        Für die Nährwert-Schätzung per Foto oder Textbeschreibung wird das Modell{' '}
        <b>Claude Sonnet 5</b> genutzt. Du brauchst einen eigenen API-Key von{' '}
        <a
          href="https://console.anthropic.com"
          target="_blank"
          rel="noreferrer"
          className="text-brand-600 underline dark:text-brand-400"
        >
          console.anthropic.com
        </a>
        . Der Key wird nur lokal auf diesem Gerät gespeichert und ausschließlich an Anthropic
        gesendet. Kosten: wenige Cent pro Schätzung.
      </p>
      {!loaded ? (
        <p className="text-sm text-slate-500">Lade…</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type={visible ? 'text' : 'password'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-…"
              aria-label="Anthropic API-Key"
              autoComplete="off"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <Button type="button" variant="ghost" onClick={() => setVisible((v) => !v)}>
              {visible ? 'Verbergen' : 'Zeigen'}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit">Speichern</Button>
            {savedAt ? <span className="text-xs text-emerald-600">Gespeichert.</span> : null}
          </div>
        </form>
      )}
    </Card>
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
      <Card as="section" className="p-4">
        <p className="text-sm text-slate-500">Lade Tagesziele…</p>
      </Card>
    );
  }

  return (
    <Card as="section" className="p-4">
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
    </Card>
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

function WeightUnitCard() {
  const { unit, setWeightUnit } = useWeightUnit();

  return (
    <Card as="section" className="p-4">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Gewichtseinheit
      </h2>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        Gilt für alle Gewichtsanzeigen und -eingaben in der App. Gespeichert wird intern immer in
        kg.
      </p>
      <div className="inline-flex overflow-hidden rounded-full border border-slate-200 dark:border-slate-700">
        <UnitButton label="kg" active={unit === 'kg'} onClick={() => void setWeightUnit('kg')} />
        <UnitButton label="lbs" active={unit === 'lbs'} onClick={() => void setWeightUnit('lbs')} />
      </div>
    </Card>
  );
}

function UnitButton({
  label,
  active,
  onClick,
}: {
  label: WeightUnit;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-medium ${
        active
          ? 'bg-brand-500 text-white'
          : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}
