import type { Macros } from '../../db/schema';

/** Fixed per user request: Sonnet 5 quality is required, Haiku is not enough. */
export const AI_MODEL = 'claude-sonnet-5';

export interface FoodEstimate {
  name: string;
  brand?: string;
  per100g: Macros;
  /** Suggested portion in grams for the described/photographed serving. */
  suggestedPortionG?: number;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
}

export class AiError extends Error {
  constructor(
    message: string,
    public readonly kind: 'no_key' | 'auth' | 'rate_limit' | 'offline' | 'bad_response' | 'other',
  ) {
    super(message);
  }
}

const ESTIMATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'per100g', 'confidence'],
  properties: {
    name: {
      type: 'string',
      description: 'Kurzer deutscher Name des Lebensmittels/Gerichts, z. B. "Spaghetti Bolognese"',
    },
    brand: { type: 'string', description: 'Marke, falls eindeutig erkennbar' },
    per100g: {
      type: 'object',
      additionalProperties: false,
      required: ['kcal', 'protein', 'carbs', 'fat'],
      properties: {
        kcal: { type: 'number', description: 'Kilokalorien pro 100 g' },
        protein: { type: 'number', description: 'Protein in g pro 100 g' },
        carbs: { type: 'number', description: 'Kohlenhydrate in g pro 100 g' },
        fat: { type: 'number', description: 'Fett in g pro 100 g' },
      },
    },
    suggestedPortionG: {
      type: 'number',
      description: 'Geschätztes Gewicht der beschriebenen/abgebildeten Portion in Gramm',
    },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    notes: {
      type: 'string',
      description: 'Kurzer Hinweis zur Schätzung, z. B. Annahmen über Zubereitung',
    },
  },
} as const;

const SYSTEM_PROMPT =
  'Du bist ein Ernährungs-Assistent in einer Fitness-App. Schätze Nährwerte pro 100 g ' +
  'für das beschriebene oder fotografierte Lebensmittel bzw. Gericht. Nutze typische ' +
  'deutsche Zubereitungen als Referenz. Wenn mehrere Lebensmittel zu sehen sind, schätze ' +
  'das Gesamtgericht als Mischung. Gib realistische, konservative Werte an.';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Pure validator so tests can exercise parsing without the API. */
export function parseEstimate(raw: unknown): FoodEstimate {
  if (!raw || typeof raw !== 'object') {
    throw new AiError('KI-Antwort hatte ein unerwartetes Format.', 'bad_response');
  }
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name.trim() : '';
  const per = (obj.per100g ?? {}) as Record<string, unknown>;
  if (!name) {
    throw new AiError('KI-Antwort enthielt keinen Namen.', 'bad_response');
  }
  const confidence =
    obj.confidence === 'high' || obj.confidence === 'medium' || obj.confidence === 'low'
      ? obj.confidence
      : 'low';
  const portion = num(obj.suggestedPortionG);
  return {
    name,
    brand: typeof obj.brand === 'string' && obj.brand.trim() ? obj.brand.trim() : undefined,
    per100g: {
      kcal: num(per.kcal),
      protein: num(per.protein),
      carbs: num(per.carbs),
      fat: num(per.fat),
    },
    suggestedPortionG: portion > 0 ? Math.round(portion) : undefined,
    confidence,
    notes: typeof obj.notes === 'string' && obj.notes.trim() ? obj.notes.trim() : undefined,
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    reader.readAsDataURL(blob);
  });
}

type UserContent =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string };
    };

async function runEstimate(apiKey: string, content: UserContent[]): Promise<FoodEstimate> {
  if (!apiKey.trim()) {
    throw new AiError('Kein API-Key hinterlegt. Trage ihn in den Einstellungen ein.', 'no_key');
  }
  // Lazy-load the SDK so it stays out of the initial bundle.
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({
    apiKey: apiKey.trim(),
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
  });
  try {
    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: ESTIMATE_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
    });
    if (response.stop_reason === 'refusal') {
      throw new AiError('Die KI hat die Anfrage abgelehnt.', 'bad_response');
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      throw new AiError('KI-Antwort war leer.', 'bad_response');
    }
    return parseEstimate(JSON.parse(text.text));
  } catch (err) {
    if (err instanceof AiError) throw err;
    const { default: Anthropic2 } = await import('@anthropic-ai/sdk');
    if (err instanceof Anthropic2.AuthenticationError) {
      throw new AiError('API-Key ungültig. Prüfe ihn in den Einstellungen.', 'auth');
    }
    if (err instanceof Anthropic2.RateLimitError) {
      throw new AiError('Rate-Limit erreicht — warte kurz und versuche es erneut.', 'rate_limit');
    }
    if (err instanceof Anthropic2.APIConnectionError) {
      throw new AiError('Keine Verbindung zur KI. Bist du online?', 'offline');
    }
    if (err instanceof Anthropic2.APIError) {
      throw new AiError(`KI-Fehler: ${err.message}`, 'other');
    }
    throw new AiError(`Unerwarteter Fehler: ${(err as Error).message}`, 'other');
  }
}

export async function estimateFoodFromText(
  apiKey: string,
  description: string,
): Promise<FoodEstimate> {
  return runEstimate(apiKey, [
    {
      type: 'text',
      text: `Schätze die Nährwerte für: ${description.trim()}`,
    },
  ]);
}

export async function estimateFoodFromImage(
  apiKey: string,
  imageBlob: Blob,
  hint?: string,
): Promise<FoodEstimate> {
  const data = await blobToBase64(imageBlob);
  const mediaType = imageBlob.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const content: UserContent[] = [
    { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
    {
      type: 'text',
      text: hint?.trim()
        ? `Schätze die Nährwerte des abgebildeten Essens. Zusatzinfo: ${hint.trim()}`
        : 'Schätze die Nährwerte des abgebildeten Essens.',
    },
  ];
  return runEstimate(apiKey, content);
}
