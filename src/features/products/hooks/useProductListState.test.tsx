import { describe, expect, it } from 'vitest';

import { markEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import type { ProductWithImages } from '@/shared/contracts/products';

import {
  applyProductListAdvancedFilterState,
  shouldAdoptIncomingEditProductDetail,
} from './useProductListState';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'Product 1', pl: null, de: null },
    description: { en: '', pl: null, de: null },
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 1,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: null,
    catalogId: '',
    tags: [],
    producers: [],
    images: [],
    catalogs: [],
    parameters: [],
    imageLinks: [],
    imageBase64s: [],
    noteIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

describe('shouldAdoptIncomingEditProductDetail', () => {
  it('adopts incoming detail for non-hydrated product when hydration request is active', () => {
    const current = createProduct({ updatedAt: '2026-03-01T10:00:00.000Z' });
    const incoming = createProduct({ updatedAt: '2026-03-01T10:00:00.000Z' });

    const result = shouldAdoptIncomingEditProductDetail({
      currentProduct: current,
      incomingProduct: incoming,
      isEditHydrating: true,
    });

    expect(result).toBe(true);
  });

  it('does not adopt incoming detail for non-hydrated product when hydration request is inactive', () => {
    const current = createProduct({ updatedAt: '2026-03-01T10:00:00.000Z' });
    const incoming = createProduct({ updatedAt: '2026-03-01T10:00:00.000Z' });

    const result = shouldAdoptIncomingEditProductDetail({
      currentProduct: current,
      incomingProduct: incoming,
      isEditHydrating: false,
    });

    expect(result).toBe(false);
  });

  it('does not adopt incoming detail for hydrated product when timestamps are equal', () => {
    const current = markEditingProductHydrated(
      createProduct({ updatedAt: '2026-03-01T10:00:00.000Z' })
    );
    const incoming = createProduct({ updatedAt: '2026-03-01T10:00:00.000Z' });

    const result = shouldAdoptIncomingEditProductDetail({
      currentProduct: current,
      incomingProduct: incoming,
      isEditHydrating: false,
    });

    expect(result).toBe(false);
  });

  it('adopts incoming detail for hydrated product when incoming timestamp is newer', () => {
    const current = markEditingProductHydrated(
      createProduct({ updatedAt: '2026-03-01T10:00:00.000Z' })
    );
    const incoming = createProduct({ updatedAt: '2026-03-01T10:00:01.000Z' });

    const result = shouldAdoptIncomingEditProductDetail({
      currentProduct: current,
      incomingProduct: incoming,
      isEditHydrating: false,
    });

    expect(result).toBe(true);
  });
});

describe('applyProductListAdvancedFilterState', () => {
  it('updates local state immediately and persists the normalized preset state', () => {
    const localCalls: Array<{ value: string; presetId: string | null }> = [];
    const persistedCalls: Array<{ advancedFilter: string; presetId: string | null }> = [];

    applyProductListAdvancedFilterState({
      value: '  {"type":"group"}  ',
      presetId: 'preset-1',
      setLocalState: (value: string, presetId: string | null) => {
        localCalls.push({ value, presetId });
      },
      persistState: async (state: {
        advancedFilter: string;
        presetId: string | null;
      }): Promise<void> => {
        persistedCalls.push(state);
      },
    });

    expect(localCalls).toEqual([{ value: '{"type":"group"}', presetId: 'preset-1' }]);
    expect(persistedCalls).toEqual([
      { advancedFilter: '{"type":"group"}', presetId: 'preset-1' },
    ]);
  });

  it('clears the preset id when the next filter value is empty', () => {
    const localCalls: Array<{ value: string; presetId: string | null }> = [];
    const persistedCalls: Array<{ advancedFilter: string; presetId: string | null }> = [];

    applyProductListAdvancedFilterState({
      value: '   ',
      presetId: 'preset-1',
      setLocalState: (value: string, presetId: string | null) => {
        localCalls.push({ value, presetId });
      },
      persistState: async (state: {
        advancedFilter: string;
        presetId: string | null;
      }): Promise<void> => {
        persistedCalls.push(state);
      },
    });

    expect(localCalls).toEqual([{ value: '', presetId: null }]);
    expect(persistedCalls).toEqual([{ advancedFilter: '', presetId: null }]);
  });
});
