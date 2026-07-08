// First AI features on the training side of the app (sibling to
// src/features/nutrition/{aiLib,nutritionAiLib}.ts). Two independent pieces:
// (1) natural-language set-logging (page-level, multi-exercise, and
// exercise-scoped shorthand), (2) an optional plateau-explanation narrative
// that may correlate training and nutrition data without asserting
// causation. Both route through the shared anthropicClient.ts plumbing.

import type { PlateauResult } from '../../lib/plateauDetection';
import { AiError, callClaudeJson, type UserContent } from '../../lib/anthropicClient';
import type { WeeklyDigestStats } from '../nutrition/nutritionLib';

/* ─────────────── Natural-language set logging ─────────────── */

export interface NlParsedSet {
  weightKg: number;
  reps: number;
  rpe?: number;
  isWarmup: boolean;
  toFailure: boolean;
}

export interface NlSetLogGroup {
  exerciseId: string | null;
  rawExerciseText: string;
  sets: NlParsedSet[];
}

const NL_SET_SHAPE = {
  type: 'object',
  additionalProperties: false,
  required: ['weightKg', 'reps'],
  properties: {
    weightKg: { type: 'number', description: 'Gewicht in kg für diesen Satz' },
    reps: { type: 'number', description: 'Anzahl Wiederholungen' },
    rpe: { type: 'number', description: 'RPE (Rate of Perceived Exertion), 1-10, falls genannt' },
    isWarmup: { type: 'boolean', description: 'true, wenn explizit als Aufwärmsatz genannt' },
    toFailure: { type: 'boolean', description: 'true, wenn bis zum Muskelversagen genannt' },
  },
} as const;

const NL_GRAMMAR_RULES =
  'Wenn für einen Satz kein neues Gewicht genannt wird (z. B. "dann 5" oder "dann noch 5"), ' +
  'übernimm das zuletzt genannte Gewicht für diese Übung unverändert. Wird ein neues Gewicht ' +
  'genannt (z. B. "85kg 5"), gilt dieses ab diesem Satz. Erkenne "Wdh"/"Wiederholungen" als ' +
  'Wiederholungen, "kg"/"Kilo" als Gewicht, "Aufwärmsatz"/"Warmup" als isWarmup:true, ' +
  '"RPE <Zahl>" als rpe, "bis zum Muskelversagen"/"bis Failure" als toFailure:true.';

function buildNlSetLogSchema(candidateIds: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['groups'],
    properties: {
      groups: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['exerciseId', 'rawExerciseText', 'sets'],
          properties: {
            exerciseId: { type: 'string', enum: [...candidateIds, 'no_match'] },
            rawExerciseText: { type: 'string', description: 'Der Textabschnitt, der die Übung benennt' },
            sets: { type: 'array', items: NL_SET_SHAPE },
          },
        },
      },
    },
  } as const;
}

const NL_SET_LOG_SYSTEM_PROMPT =
  'Du bist ein Trainings-Assistent in einer Fitness-App. Wandle die Beschreibung geloggter ' +
  'Sätze in strukturierte Daten um. Die verfügbaren Übungen sind unten mit ID aufgelistet — ' +
  'wähle für jede erkannte Übung im Text die passende ID. Wenn keine Übung im Text eindeutig ' +
  'zu einer Übung aus der Liste passt, verwende "no_match" und gib den erkannten Rohtext in ' +
  `rawExerciseText zurück. Erfinde keine Übung, die nicht in der Liste steht. ${NL_GRAMMAR_RULES}`;

const NL_SET_SHORTHAND_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sets'],
  properties: { sets: { type: 'array', items: NL_SET_SHAPE } },
} as const;

function nlSetShorthandSystemPrompt(exerciseName: string): string {
  return (
    `Du bist ein Trainings-Assistent in einer Fitness-App. Die Sätze im folgenden Text sind ` +
    `für die Übung „${exerciseName}". Wandle sie in strukturierte Satzdaten um. ${NL_GRAMMAR_RULES}`
  );
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseNlSet(raw: unknown): NlParsedSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const weightKg = num(obj.weightKg);
  const reps = num(obj.reps);
  if (weightKg <= 0 || reps <= 0) return null;
  const rpe = typeof obj.rpe === 'number' && Number.isFinite(obj.rpe) && obj.rpe > 0 ? obj.rpe : undefined;
  return {
    weightKg,
    reps,
    rpe,
    isWarmup: obj.isWarmup === true,
    toFailure: obj.toFailure === true,
  };
}

/** Pure validator so tests can exercise parsing without the API. Defensively re-checks exerciseId against candidateIds even though the schema enum should already guarantee it. */
export function parseNlSetLogGroups(raw: unknown, candidateIds: Set<string>): NlSetLogGroup[] {
  if (!raw || typeof raw !== 'object') {
    throw new AiError('KI-Antwort hatte ein unerwartetes Format.', 'bad_response');
  }
  const obj = raw as Record<string, unknown>;
  const groupsRaw = Array.isArray(obj.groups) ? obj.groups : [];
  return groupsRaw
    .map((g): NlSetLogGroup => {
      const group = (g && typeof g === 'object' ? g : {}) as Record<string, unknown>;
      const rawId = typeof group.exerciseId === 'string' ? group.exerciseId : null;
      const exerciseId = rawId && candidateIds.has(rawId) ? rawId : null;
      const rawExerciseText =
        typeof group.rawExerciseText === 'string' ? group.rawExerciseText.trim() : '';
      const setsRaw = Array.isArray(group.sets) ? group.sets : [];
      const sets = setsRaw.map(parseNlSet).filter((s): s is NlParsedSet => s !== null);
      return { exerciseId, rawExerciseText, sets };
    })
    .filter((g) => g.sets.length > 0);
}

/** Pure validator so tests can exercise parsing without the API. */
export function parseNlSetShorthand(raw: unknown): NlParsedSet[] {
  if (!raw || typeof raw !== 'object') {
    throw new AiError('KI-Antwort hatte ein unerwartetes Format.', 'bad_response');
  }
  const obj = raw as Record<string, unknown>;
  const setsRaw = Array.isArray(obj.sets) ? obj.sets : [];
  return setsRaw.map(parseNlSet).filter((s): s is NlParsedSet => s !== null);
}

export async function estimateNlSetLog(
  apiKey: string,
  text: string,
  candidates: { id: string; name: string }[],
): Promise<NlSetLogGroup[]> {
  const content: UserContent[] = [
    {
      type: 'text',
      text:
        `Verfügbare Übungen:\n${candidates.map((c) => `${c.id}: ${c.name}`).join('\n')}\n\n` +
        `Protokoll-Text: ${text.trim()}`,
    },
  ];
  const raw = await callClaudeJson({
    apiKey,
    system: NL_SET_LOG_SYSTEM_PROMPT,
    content,
    schema: buildNlSetLogSchema(candidates.map((c) => c.id)),
    maxTokens: 2048,
  });
  return parseNlSetLogGroups(raw, new Set(candidates.map((c) => c.id)));
}

export async function estimateNlSetShorthand(
  apiKey: string,
  text: string,
  exerciseName: string,
): Promise<NlParsedSet[]> {
  const content: UserContent[] = [{ type: 'text', text: text.trim() }];
  const raw = await callClaudeJson({
    apiKey,
    system: nlSetShorthandSystemPrompt(exerciseName),
    content,
    schema: NL_SET_SHORTHAND_SCHEMA,
  });
  return parseNlSetShorthand(raw);
}

/* ─────────────── Plateau explanation ─────────────── */

export interface PlateauExplanationContext {
  exerciseName: string;
  plateauResult: PlateauResult;
  nutritionStats: WeeklyDigestStats;
}

export interface PlateauExplanationText {
  narrative: string;
}

const PLATEAU_EXPLANATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['narrative'],
  properties: {
    narrative: {
      type: 'string',
      description:
        'Ein bis drei kurze, freundliche Sätze auf Deutsch, die die Stagnation einordnen. ' +
        'Nur die gegebenen Zahlen verwenden, keine neuen erfinden.',
    },
  },
} as const;

const PLATEAU_EXPLANATION_SYSTEM_PROMPT =
  'Du bist ein Trainings-Coach in einer Fitness-App. Ordne kurz und freundlich auf Deutsch ' +
  'ein, warum eine Übung möglicherweise stagniert. Du bekommst sowohl Trainings- als auch ' +
  'Ernährungszahlen aus demselben Zeitraum. Du darfst beschreiben, wenn beides gleichzeitig ' +
  'auftritt (z. B. "während", "im selben Zeitraum"), aber NIEMALS behaupten oder andeuten, ' +
  'dass die Ernährung die Stagnation verursacht hat oder umgekehrt — vermeide Wörter wie ' +
  '"weil", "deshalb", "dadurch", "der Grund dafür ist", "das liegt an". Formuliere jede ' +
  'Verbindung als Beobachtung, keine Diagnose, und schließe mit einem vorsichtigen, ' +
  'unverbindlichen Hinweis statt einer Anweisung. Erfinde keine neuen Zahlen, nutze ' +
  'ausschließlich die gegebenen.';

/** Pure validator so tests can exercise parsing without the API. */
export function parsePlateauExplanation(raw: unknown): PlateauExplanationText {
  if (!raw || typeof raw !== 'object') {
    throw new AiError('KI-Antwort hatte ein unerwartetes Format.', 'bad_response');
  }
  const obj = raw as Record<string, unknown>;
  const narrative = typeof obj.narrative === 'string' ? obj.narrative.trim() : '';
  if (!narrative) {
    throw new AiError('KI-Antwort enthielt keine Erzählung.', 'bad_response');
  }
  return { narrative };
}

function formatPlateauContextForPrompt(ctx: PlateauExplanationContext): string {
  const { exerciseName, plateauResult, nutritionStats } = ctx;
  const parts = [
    `Übung: ${exerciseName}`,
    `Status: ${plateauResult.status === 'regressing' ? 'Kraftwerte sind gesunken' : 'Kraftwerte stagnieren'}`,
    `Bestes geschätztes 1RM zuletzt (${plateauResult.currentWindowWorkouts} Workouts): ${plateauResult.currentBestE1rmKg?.toFixed(1)} kg`,
    `Bestes geschätztes 1RM davor (${plateauResult.baselineWindowWorkouts} Workouts): ${plateauResult.baselineBestE1rmKg?.toFixed(1)} kg`,
    `Ø Kalorien im selben Zeitraum: ${Math.round(nutritionStats.avgKcal)} kcal (Ziel: ${nutritionStats.targetKcal} kcal, ${Math.round(nutritionStats.kcalAdherencePercent)}% des Ziels)`,
    `Ø Protein im selben Zeitraum: ${Math.round(nutritionStats.avgProteinG)} g (Ziel: ${nutritionStats.targetProteinG} g, ${Math.round(nutritionStats.proteinAdherencePercent)}% des Ziels)`,
    `Geloggte Tage: ${nutritionStats.daysWithLog} von ${nutritionStats.totalDays}`,
  ];
  if (nutritionStats.weightChangeKg !== null && nutritionStats.weightTrendDays !== null) {
    const sign = nutritionStats.weightChangeKg >= 0 ? '+' : '';
    parts.push(
      `Gewichtstrend: ${sign}${nutritionStats.weightChangeKg.toFixed(1)} kg über ${nutritionStats.weightTrendDays} Tage`,
    );
  }
  return parts.join('\n');
}

export async function explainPlateau(
  apiKey: string,
  ctx: PlateauExplanationContext,
): Promise<PlateauExplanationText> {
  const content: UserContent[] = [{ type: 'text', text: formatPlateauContextForPrompt(ctx) }];
  const raw = await callClaudeJson({
    apiKey,
    system: PLATEAU_EXPLANATION_SYSTEM_PROMPT,
    content,
    schema: PLATEAU_EXPLANATION_SCHEMA,
    maxTokens: 512,
  });
  return parsePlateauExplanation(raw);
}
