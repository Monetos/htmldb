import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarcodeLookupError, lookupBarcode, mapOffResponse } from '../openFoodFacts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mapOffResponse', () => {
  it('maps a complete product with German name preferred', () => {
    const result = mapOffResponse('4000417025005', {
      status: 1,
      product: {
        product_name: 'Chocolate',
        product_name_de: 'Schokolade',
        brands: 'Milka,Mondelez',
        nutriments: {
          'energy-kcal_100g': 530,
          proteins_100g: 6.5,
          carbohydrates_100g: 58,
          fat_100g: 29,
        },
      },
    });
    expect(result).toEqual({
      barcode: '4000417025005',
      name: 'Schokolade',
      brand: 'Milka',
      per100g: { kcal: 530, protein: 6.5, carbs: 58, fat: 29 },
      complete: true,
    });
  });

  it('returns null for status 0 (unknown product)', () => {
    expect(mapOffResponse('123', { status: 0 })).toBeNull();
  });

  it('returns null when the product has no name', () => {
    expect(mapOffResponse('123', { status: 1, product: { nutriments: {} } })).toBeNull();
  });

  it('marks products without kcal as incomplete and zero-fills macros', () => {
    const result = mapOffResponse('123', {
      status: 1,
      product: { product_name: 'Mystery', nutriments: { proteins_100g: 10 } },
    });
    expect(result?.complete).toBe(false);
    expect(result?.per100g).toEqual({ kcal: 0, protein: 10, carbs: 0, fat: 0 });
  });
});

describe('lookupBarcode', () => {
  it('rejects codes that are too short without hitting the network', async () => {
    await expect(lookupBarcode('123')).rejects.toThrow(BarcodeLookupError);
  });

  it('returns the mapped product on a successful fetch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            status: 1,
            product: {
              product_name: 'Haferflocken',
              nutriments: { 'energy-kcal_100g': 370, proteins_100g: 13 },
            },
          }),
          { status: 200 },
        ),
      ),
    );
    const result = await lookupBarcode('40123456');
    expect(result?.name).toBe('Haferflocken');
    expect(result?.per100g.kcal).toBe(370);
  });

  it('returns null on HTTP 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    expect(await lookupBarcode('40123456')).toBeNull();
  });

  it('throws an offline error when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('network down');
    }));
    await expect(lookupBarcode('40123456')).rejects.toMatchObject({ kind: 'offline' });
  });
});
