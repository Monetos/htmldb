import { describe, expect, it } from 'vitest';
import { AI_MODEL, AiError, parseEstimate } from '../aiLib';

describe('AI_MODEL', () => {
  it('is pinned to Claude Sonnet 5 per product decision', () => {
    expect(AI_MODEL).toBe('claude-sonnet-5');
  });
});

describe('parseEstimate', () => {
  it('accepts a full valid estimate', () => {
    const result = parseEstimate({
      name: ' Spaghetti Bolognese ',
      brand: '',
      per100g: { kcal: 158, protein: 8.1, carbs: 18, fat: 5.5 },
      suggestedPortionG: 421.7,
      confidence: 'medium',
      notes: 'Mit Hackfleisch gerechnet.',
    });
    expect(result.name).toBe('Spaghetti Bolognese');
    expect(result.brand).toBeUndefined();
    expect(result.per100g).toEqual({ kcal: 158, protein: 8.1, carbs: 18, fat: 5.5 });
    expect(result.suggestedPortionG).toBe(422);
    expect(result.confidence).toBe('medium');
    expect(result.notes).toBe('Mit Hackfleisch gerechnet.');
  });

  it('clamps negative or invalid macro values to 0 and defaults confidence to low', () => {
    const result = parseEstimate({
      name: 'X',
      per100g: { kcal: -5, protein: 'abc', carbs: null, fat: 3 },
      confidence: 'certainly!',
    });
    expect(result.per100g).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 3 });
    expect(result.confidence).toBe('low');
    expect(result.suggestedPortionG).toBeUndefined();
  });

  it('throws AiError for a missing name', () => {
    expect(() => parseEstimate({ per100g: { kcal: 1 } })).toThrow(AiError);
  });

  it('throws AiError for non-object payloads', () => {
    expect(() => parseEstimate('nope')).toThrow(AiError);
    expect(() => parseEstimate(null)).toThrow(AiError);
  });
});
