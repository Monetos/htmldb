// Shared Anthropic SDK plumbing for every AI-touched feature (nutrition food
// estimation, adaptive TDEE explanations, weekly digest, and future fitness
// AI). Keeps the client construction, structured-output request shape, and
// error mapping in one place instead of duplicated per feature.

/** Fixed per user request: Sonnet 5 quality is required, Haiku is not enough. */
export const AI_MODEL = 'claude-sonnet-5';

export class AiError extends Error {
  constructor(
    message: string,
    public readonly kind: 'no_key' | 'auth' | 'rate_limit' | 'offline' | 'bad_response' | 'other',
  ) {
    super(message);
  }
}

export type UserContent =
  | { type: 'text'; text: string }
  | {
      type: 'image';
      source: { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp'; data: string };
    };

export interface CallClaudeJsonOptions {
  apiKey: string;
  system: string;
  content: UserContent[];
  schema: Record<string, unknown>;
  maxTokens?: number;
}

/** Runs a single structured-output request and returns the parsed JSON body. */
export async function callClaudeJson({
  apiKey,
  system,
  content,
  schema,
  maxTokens = 1024,
}: CallClaudeJsonOptions): Promise<unknown> {
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
      max_tokens: maxTokens,
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema },
      },
      system,
      messages: [{ role: 'user', content }],
    });
    if (response.stop_reason === 'refusal') {
      throw new AiError('Die KI hat die Anfrage abgelehnt.', 'bad_response');
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') {
      throw new AiError('KI-Antwort war leer.', 'bad_response');
    }
    return JSON.parse(text.text);
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
