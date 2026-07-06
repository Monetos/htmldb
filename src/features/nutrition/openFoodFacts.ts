import type { Macros } from '../../db/schema';

export interface BarcodeProduct {
  barcode: string;
  name: string;
  brand?: string;
  per100g: Macros;
  /** True when at least kcal was present in the source data. */
  complete: boolean;
}

export class BarcodeLookupError extends Error {
  constructor(
    message: string,
    public readonly kind: 'offline' | 'not_found' | 'invalid',
  ) {
    super(message);
  }
}

interface OffNutriments {
  'energy-kcal_100g'?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
}

interface OffResponse {
  status?: number;
  product?: {
    product_name?: string;
    product_name_de?: string;
    brands?: string;
    nutriments?: OffNutriments;
  };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Pure mapper so tests can exercise the parsing without network access. */
export function mapOffResponse(barcode: string, data: OffResponse): BarcodeProduct | null {
  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const name = (p.product_name_de || p.product_name || '').trim();
  if (!name) return null;
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']);
  return {
    barcode,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    per100g: {
      kcal,
      protein: num(n.proteins_100g),
      carbs: num(n.carbohydrates_100g),
      fat: num(n.fat_100g),
    },
    complete: kcal > 0,
  };
}

const OFF_FIELDS = 'product_name,product_name_de,brands,nutriments';

/**
 * Looks a barcode up in the Open Food Facts database (requires internet).
 * Returns null when the product is unknown; throws BarcodeLookupError for
 * network problems so the UI can distinguish "offline" from "not found".
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeProduct | null> {
  const clean = barcode.replace(/\D/g, '');
  if (clean.length < 8 || clean.length > 14) {
    throw new BarcodeLookupError('Ungültiger Barcode.', 'invalid');
  }
  let response: Response;
  try {
    response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${OFF_FIELDS}`,
      { headers: { Accept: 'application/json' } },
    );
  } catch {
    throw new BarcodeLookupError(
      'Keine Verbindung zur Lebensmittel-Datenbank. Bist du online?',
      'offline',
    );
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new BarcodeLookupError(
      `Datenbank antwortet nicht (HTTP ${response.status}).`,
      'offline',
    );
  }
  const data = (await response.json()) as OffResponse;
  return mapOffResponse(clean, data);
}
