import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import {
  acceptTdeeAdjustment,
  attachTdeeExplanation,
  computeCurrentTdeeEstimate,
  enableAdaptiveTdee,
  maybeRecalcTdee,
  rejectTdeeAdjustment,
  setAdaptiveTdeeEnabled,
} from '../nutrition/tdeeService';
import { explainTdeeChange } from '../nutrition/nutritionAiLib';
import { AiError } from '../../lib/anthropicClient';
import type { TdeeEstimateResult } from '../../lib/adaptiveTdee';

const STATUS_MESSAGE: Record<Exclude<TdeeEstimateResult['status'], 'ok'>, string> = {
  insufficient_weight_data:
    'Noch nicht genug Daten: mindestens 3 Gewichtseinträge über 10 Tage nötig.',
  insufficient_intake_data:
    'Noch nicht genug Daten: mindestens 7 Tage mit geloggtem Essen in den letzten 14 Tagen nötig.',
};

export function TdeeCard() {
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const apiKey = settings?.anthropicApiKey ?? '';
  const enabled = settings?.adaptiveTdeeEnabled ?? false;
  const pending = settings?.pendingTdeeAdjustment;

  const [toggling, setToggling] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const [statusResult, setStatusResult] = useState<TdeeEstimateResult | null>(null);

  useEffect(() => {
    if (!enabled || pending) {
      setStatusResult(null);
      return;
    }
    let cancelled = false;
    computeCurrentTdeeEstimate(Date.now()).then((result) => {
      if (!cancelled) setStatusResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, pending, settings?.lastTdeeRecalcAt]);

  const onToggle = async () => {
    setToggling(true);
    try {
      if (enabled) {
        await setAdaptiveTdeeEnabled(false);
      } else {
        await enableAdaptiveTdee();
      }
    } finally {
      setToggling(false);
    }
  };

  const onRecalc = async () => {
    setRecalculating(true);
    try {
      await maybeRecalcTdee(Date.now(), { force: true });
    } finally {
      setRecalculating(false);
    }
  };

  const onExplain = async () => {
    if (!pending) return;
    setExplaining(true);
    setExplainError(null);
    try {
      const result = await explainTdeeChange(apiKey, pending);
      await attachTdeeExplanation(result.explanation);
    } catch (err) {
      setExplainError(err instanceof AiError ? err.message : (err as Error).message);
    } finally {
      setExplaining(false);
    }
  };

  return (
    <Card as="section" className="p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Adaptives Kalorienziel
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Adaptives Kalorienziel aktivieren"
          disabled={toggling}
          onClick={() => void onToggle()}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            enabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              enabled ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
        Berechnet wöchentlich aus deinem Gewichtstrend und geloggten Kalorien einen realistischen
        Erhaltungsbedarf und schlägt bei Bedarf ein neues Kalorienziel vor. Wird nie automatisch
        übernommen — du entscheidest jedes Mal.
      </p>

      {!enabled ? null : pending ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-brand-200 bg-brand-50 p-3 text-sm dark:border-brand-700 dark:bg-brand-900/20">
            <p className="text-slate-700 dark:text-slate-200">
              Dein Kalorienziel hat sich geändert:{' '}
              <b>
                {pending.previousKcal} kcal → {pending.proposedKcal} kcal
              </b>{' '}
              (geschätzter Erhaltungsbedarf: {pending.estimatedTdeeKcal} kcal). Protein bleibt bei{' '}
              {pending.proposedProteinG} g, Kohlenhydrate/Fett werden proportional angepasst.
            </p>
            {pending.explanation ? (
              <p className="mt-2 italic text-slate-600 dark:text-slate-300">{pending.explanation}</p>
            ) : null}
            {explainError ? <p className="mt-2 text-rose-600">{explainError}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {!pending.explanation ? (
              <Button variant="ghost" onClick={() => void onExplain()} disabled={explaining || !apiKey}>
                {explaining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Claude erklärt…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Warum?
                  </>
                )}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => void rejectTdeeAdjustment()}>
              Verwerfen
            </Button>
            <Button className="flex-1" onClick={() => void acceptTdeeAdjustment()}>
              Übernehmen
            </Button>
          </div>
        </div>
      ) : statusResult && statusResult.status !== 'ok' ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
            {STATUS_MESSAGE[statusResult.status]}
          </div>
          <Button variant="secondary" onClick={() => void onRecalc()} disabled={recalculating}>
            {recalculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Prüfe…
              </>
            ) : (
              'Jetzt neu berechnen'
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            {settings?.lastTdeeEstimateKcal
              ? `Letzte Schätzung: TDEE ≈ ${settings.lastTdeeEstimateKcal} kcal${
                  settings.lastTdeeRecalcAt
                    ? `, geprüft am ${new Date(settings.lastTdeeRecalcAt).toLocaleDateString('de-DE')}`
                    : ''
                }.`
              : 'Noch keine Schätzung vorhanden.'}
          </p>
          <Button variant="secondary" onClick={() => void onRecalc()} disabled={recalculating}>
            {recalculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Prüfe…
              </>
            ) : (
              'Jetzt neu berechnen'
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
