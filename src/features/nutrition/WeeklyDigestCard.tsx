import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Sparkles } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { DEFAULT_DAILY_TARGETS } from '../../db/schema';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { AiError } from '../../lib/anthropicClient';
import { latestWeightTrend } from '../body/bodyLib';
import { buildDigestStats, weeklyTotals } from './nutritionLib';
import { generateWeeklyDigest, type WeeklyDigestText } from './nutritionAiLib';

/**
 * Ephemeral, button-triggered AI recap of the week: all the numbers are
 * precomputed locally (buildDigestStats), Claude only writes prose about
 * them. Nothing here is persisted — a reload just means "generate again".
 */
export function WeeklyDigestCard() {
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const apiKey = settings?.anthropicApiKey ?? '';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<WeeklyDigestText | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const now = Date.now();
      const [week, weightTrend] = await Promise.all([weeklyTotals(now, 7), latestWeightTrend(now)]);
      const targets = settings?.dailyTargets ?? DEFAULT_DAILY_TARGETS;
      const stats = buildDigestStats(week, targets, weightTrend, settings?.lastTdeeEstimateKcal ?? null);
      const result = await generateWeeklyDigest(apiKey, stats);
      setDigest(result);
    } catch (err) {
      setError(err instanceof AiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card as="section" className="p-4">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        <Sparkles className="h-4 w-4 text-brand-500" /> Wochenrückblick
      </h2>

      {!apiKey ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          Für den KI-Wochenrückblick brauchst du einen Anthropic-API-Key.{' '}
          <Link to="/einstellungen" className="font-medium underline">
            In den Einstellungen hinterlegen →
          </Link>
        </div>
      ) : digest ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-slate-700 dark:text-slate-200">{digest.summary}</p>
            <p className="mt-2 font-medium text-slate-700 dark:text-slate-200">{digest.tip}</p>
          </div>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button variant="ghost" onClick={() => void run()} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Claude analysiert…
              </>
            ) : (
              'Neu generieren'
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Lässt Claude deine Kalorien-/Protein-Treue und deinen Gewichtstrend dieser Woche kurz
            einordnen und gibt einen Tipp für die kommende Woche.
          </p>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button onClick={() => void run()} disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Claude analysiert…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Wochenrückblick erstellen
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
