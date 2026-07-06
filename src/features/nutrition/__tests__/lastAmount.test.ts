import { describe, expect, it } from 'vitest';
import { lastAmountForFood, logFood, saveFood } from '../nutritionLib';

describe('lastAmountForFood', () => {
  it('returns null when the food was never logged', async () => {
    const food = await saveFood({
      name: 'A',
      per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 },
    });
    expect(await lastAmountForFood(food.id)).toBeNull();
  });

  it('returns the most recently logged amount for that food', async () => {
    const a = await saveFood({ name: 'A', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } });
    const b = await saveFood({ name: 'B', per100g: { kcal: 1, protein: 0, carbs: 0, fat: 0 } });
    const day = 86_400_000;
    await logFood({ foodId: a.id, amountG: 150, mealType: 'lunch', date: Date.now() - day });
    await logFood({ foodId: a.id, amountG: 250, mealType: 'dinner', date: Date.now() });
    await logFood({ foodId: b.id, amountG: 80, mealType: 'snack', date: Date.now() });
    expect(await lastAmountForFood(a.id)).toBe(250);
    expect(await lastAmountForFood(b.id)).toBe(80);
  });
});
