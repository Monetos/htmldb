import { describe, expect, it } from 'vitest';
import { AiError } from '../../../lib/anthropicClient';
import { parseTdeeExplanation, parseWeeklyDigest } from '../nutritionAiLib';

describe('parseTdeeExplanation', () => {
  it('accepts a valid explanation and trims whitespace', () => {
    const result = parseTdeeExplanation({ explanation: '  Dein Ziel ist gestiegen, weil du weniger abnimmst.  ' });
    expect(result.explanation).toBe('Dein Ziel ist gestiegen, weil du weniger abnimmst.');
  });

  it('throws AiError when the explanation is missing or blank', () => {
    expect(() => parseTdeeExplanation({})).toThrow(AiError);
    expect(() => parseTdeeExplanation({ explanation: '   ' })).toThrow(AiError);
  });

  it('throws AiError for non-object payloads', () => {
    expect(() => parseTdeeExplanation('nope')).toThrow(AiError);
    expect(() => parseTdeeExplanation(null)).toThrow(AiError);
  });
});

describe('parseWeeklyDigest', () => {
  it('accepts a valid summary+tip and trims whitespace', () => {
    const result = parseWeeklyDigest({
      summary: '  Du warst diese Woche sehr konstant.  ',
      tip: '  Trink noch etwas mehr Wasser.  ',
    });
    expect(result.summary).toBe('Du warst diese Woche sehr konstant.');
    expect(result.tip).toBe('Trink noch etwas mehr Wasser.');
  });

  it('throws AiError when summary or tip is missing', () => {
    expect(() => parseWeeklyDigest({ summary: 'Nur Summary.' })).toThrow(AiError);
    expect(() => parseWeeklyDigest({ tip: 'Nur Tipp.' })).toThrow(AiError);
    expect(() => parseWeeklyDigest({ summary: '', tip: '' })).toThrow(AiError);
  });

  it('throws AiError for non-object payloads', () => {
    expect(() => parseWeeklyDigest('nope')).toThrow(AiError);
    expect(() => parseWeeklyDigest(undefined)).toThrow(AiError);
  });
});
