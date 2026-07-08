import type { TdeeAdjustmentSuggestion } from '../../db/schema';
import { AiError, callClaudeJson, type UserContent } from '../../lib/anthropicClient';
import type { WeeklyDigestStats } from './nutritionLib';

/* ─────────────── Adaptive TDEE explanation ─────────────── */

export interface TdeeExplanationText {
  explanation: string;
}

const TDEE_EXPLANATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['explanation'],
  properties: {
    explanation: {
      type: 'string',
      description:
        'Ein bis zwei kurze, freundliche Sätze auf Deutsch, die erklären, warum sich das ' +
        'Kalorienziel geändert hat. Nur die gegebenen Zahlen verwenden, keine neuen erfinden.',
    },
  },
} as const;

const TDEE_EXPLANATION_SYSTEM_PROMPT =
  'Du bist ein Ernährungs-Coach in einer Fitness-App. Erkläre kurz und freundlich auf Deutsch, ' +
  'warum sich das automatisch berechnete Kalorienziel geändert hat. Nutze ausschließlich die im ' +
  'Prompt gegebenen Zahlen, erfinde nichts dazu.';

/** Pure validator so tests can exercise parsing without the API. */
export function parseTdeeExplanation(raw: unknown): TdeeExplanationText {
  if (!raw || typeof raw !== 'object') {
    throw new AiError('KI-Antwort hatte ein unerwartetes Format.', 'bad_response');
  }
  const obj = raw as Record<string, unknown>;
  const explanation = typeof obj.explanation === 'string' ? obj.explanation.trim() : '';
  if (!explanation) {
    throw new AiError('KI-Antwort enthielt keine Erklärung.', 'bad_response');
  }
  return { explanation };
}

export async function explainTdeeChange(
  apiKey: string,
  suggestion: TdeeAdjustmentSuggestion,
): Promise<TdeeExplanationText> {
  const content: UserContent[] = [
    {
      type: 'text',
      text:
        `Bisheriges Kalorienziel: ${suggestion.previousKcal} kcal. ` +
        `Neu berechneter Erhaltungsbedarf (TDEE): ${suggestion.estimatedTdeeKcal} kcal. ` +
        `Vorgeschlagenes neues Ziel: ${suggestion.proposedKcal} kcal.`,
    },
  ];
  const raw = await callClaudeJson({
    apiKey,
    system: TDEE_EXPLANATION_SYSTEM_PROMPT,
    content,
    schema: TDEE_EXPLANATION_SCHEMA,
    maxTokens: 512,
  });
  return parseTdeeExplanation(raw);
}

/* ─────────────── Weekly digest ─────────────── */

export interface WeeklyDigestText {
  summary: string;
  tip: string;
}

const DIGEST_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'tip'],
  properties: {
    summary: {
      type: 'string',
      description:
        'Ein bis zwei freundliche Sätze, die ausschließlich die im Prompt gegebenen Zahlen ' +
        '(Kalorien-/Makro-Treue, Gewichtstrend) einordnen. Keine neuen Zahlen erfinden.',
    },
    tip: {
      type: 'string',
      description: 'Ein konkreter, umsetzbarer Tipp für die kommende Woche, basierend auf den Daten.',
    },
  },
} as const;

const DIGEST_SYSTEM_PROMPT =
  'Du bist ein Ernährungs-Coach in einer Fitness-App. Ordne die gegebenen Wochenzahlen ' +
  '(Kalorien-/Protein-Treue, Gewichtstrend, ggf. TDEE-Schätzung) kurz und freundlich auf Deutsch ' +
  'ein und gib einen konkreten Tipp für die kommende Woche. Erfinde keine neuen Zahlen.';

/** Pure validator so tests can exercise parsing without the API. */
export function parseWeeklyDigest(raw: unknown): WeeklyDigestText {
  if (!raw || typeof raw !== 'object') {
    throw new AiError('KI-Antwort hatte ein unerwartetes Format.', 'bad_response');
  }
  const obj = raw as Record<string, unknown>;
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
  const tip = typeof obj.tip === 'string' ? obj.tip.trim() : '';
  if (!summary || !tip) {
    throw new AiError('KI-Antwort war unvollständig.', 'bad_response');
  }
  return { summary, tip };
}

function formatDigestStatsForPrompt(stats: WeeklyDigestStats): string {
  const parts = [
    `Ø Kalorien: ${Math.round(stats.avgKcal)} kcal (Ziel: ${stats.targetKcal} kcal, ${Math.round(stats.kcalAdherencePercent)}% des Ziels)`,
    `Ø Protein: ${Math.round(stats.avgProteinG)} g (Ziel: ${stats.targetProteinG} g, ${Math.round(stats.proteinAdherencePercent)}% des Ziels)`,
    `Geloggte Tage: ${stats.daysWithLog} von ${stats.totalDays}`,
  ];
  if (stats.weightChangeKg !== null && stats.weightTrendDays !== null) {
    const sign = stats.weightChangeKg >= 0 ? '+' : '';
    parts.push(`Gewichtstrend: ${sign}${stats.weightChangeKg.toFixed(1)} kg über ${stats.weightTrendDays} Tage`);
  }
  if (stats.tdeeEstimateKcal !== null) {
    parts.push(`Geschätzter Erhaltungsbedarf (TDEE): ${stats.tdeeEstimateKcal} kcal`);
  }
  return parts.join('\n');
}

export async function generateWeeklyDigest(
  apiKey: string,
  stats: WeeklyDigestStats,
): Promise<WeeklyDigestText> {
  const content: UserContent[] = [{ type: 'text', text: formatDigestStatsForPrompt(stats) }];
  const raw = await callClaudeJson({
    apiKey,
    system: DIGEST_SYSTEM_PROMPT,
    content,
    schema: DIGEST_SCHEMA,
    maxTokens: 512,
  });
  return parseWeeklyDigest(raw);
}
