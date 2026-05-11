import type { Food } from './schema';

type SeedTemplate = Omit<Food, 'id' | 'createdAt' | 'isCustom' | 'brand'> & {
  slug: string;
};

const TEMPLATES: SeedTemplate[] = [
  { slug: 'magerquark', name: 'Magerquark', per100g: { kcal: 67, protein: 12, carbs: 4, fat: 0.3 } },
  { slug: 'joghurt-1-5', name: 'Joghurt 1,5% Fett', per100g: { kcal: 47, protein: 4.3, carbs: 5.6, fat: 1.5 } },
  { slug: 'magermilch', name: 'Magermilch', per100g: { kcal: 35, protein: 3.4, carbs: 5, fat: 0.1 } },
  { slug: 'huehnerbrust-roh', name: 'Hähnchenbrust roh', per100g: { kcal: 110, protein: 23, carbs: 0, fat: 1.5 } },
  { slug: 'huehnerbrust-gegrillt', name: 'Hähnchenbrust gegrillt', per100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } },
  { slug: 'putenbrust-roh', name: 'Putenbrust roh', per100g: { kcal: 135, protein: 30, carbs: 0, fat: 1 } },
  { slug: 'putenaufschnitt', name: 'Putenaufschnitt', per100g: { kcal: 110, protein: 18, carbs: 1, fat: 4 } },
  { slug: 'lachs-roh', name: 'Lachs roh', per100g: { kcal: 208, protein: 20, carbs: 0, fat: 13 } },
  { slug: 'thunfisch-wasser', name: 'Thunfisch (in Wasser)', per100g: { kcal: 116, protein: 26, carbs: 0, fat: 1 } },
  { slug: 'ei', name: 'Ei', per100g: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 } },
  { slug: 'mozzarella-light', name: 'Mozzarella light', per100g: { kcal: 175, protein: 25, carbs: 1, fat: 8 } },
  { slug: 'reis-gekocht', name: 'Reis gekocht', per100g: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
  { slug: 'reis-roh', name: 'Reis roh', per100g: { kcal: 360, protein: 7, carbs: 78, fat: 0.7 } },
  { slug: 'basmati-gekocht', name: 'Basmati gekocht', per100g: { kcal: 121, protein: 2.5, carbs: 25, fat: 0.4 } },
  { slug: 'haferflocken', name: 'Haferflocken', per100g: { kcal: 370, protein: 13, carbs: 60, fat: 7 } },
  { slug: 'nudeln-gekocht', name: 'Nudeln gekocht', per100g: { kcal: 158, protein: 5, carbs: 31, fat: 1 } },
  { slug: 'vollkornnudeln-gekocht', name: 'Vollkornnudeln gekocht', per100g: { kcal: 124, protein: 5, carbs: 26, fat: 1 } },
  { slug: 'kartoffel-gekocht', name: 'Kartoffel gekocht', per100g: { kcal: 77, protein: 2, carbs: 17, fat: 0.1 } },
  { slug: 'suesskartoffel', name: 'Süßkartoffel', per100g: { kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 } },
  { slug: 'vollkornbrot', name: 'Vollkornbrot', per100g: { kcal: 250, protein: 9, carbs: 45, fat: 3 } },
  { slug: 'reiscracker', name: 'Reiscracker', per100g: { kcal: 380, protein: 7, carbs: 81, fat: 3 } },
  { slug: 'banane', name: 'Banane', per100g: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
  { slug: 'apfel', name: 'Apfel', per100g: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
  { slug: 'tomate', name: 'Tomate', per100g: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
  { slug: 'brokkoli', name: 'Brokkoli', per100g: { kcal: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
  { slug: 'karotte', name: 'Karotte', per100g: { kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 } },
  { slug: 'linsen-gekocht', name: 'Linsen gekocht', per100g: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 } },
  { slug: 'mandeln', name: 'Mandeln', per100g: { kcal: 579, protein: 21, carbs: 22, fat: 50 } },
  { slug: 'erdnussbutter', name: 'Erdnussbutter', per100g: { kcal: 588, protein: 25, carbs: 20, fat: 50 } },
  { slug: 'olivenoel', name: 'Olivenöl', per100g: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
  { slug: 'honig', name: 'Honig', per100g: { kcal: 304, protein: 0.3, carbs: 82, fat: 0 } },
  { slug: 'whey-protein', name: 'Whey-Protein', per100g: { kcal: 380, protein: 75, carbs: 8, fat: 5 } },
];

export const SEED_FOODS: Food[] = TEMPLATES.map((t) => ({
  id: `seed-food-${t.slug}`,
  name: t.name,
  per100g: t.per100g,
  isCustom: false,
  createdAt: 0,
}));

export const SEED_FOOD_COUNT = SEED_FOODS.length;
