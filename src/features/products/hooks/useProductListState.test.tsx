import { describe, expect, it, vi } from 'vitest';

import { markEditingProductHydrated } from '@/features/products/hooks/editingProductHydration';
import type { ProductWithImages } from '@/shared/contracts/products';

import {
  applyProductListAdvancedFilterState,
  scheduleDeferredProductListDraftBootstrap,
  shouldEnableProductListBackgroundSync,
  shouldEnableProductListBackgroundSyncRuntime,
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

  it('adopts incoming detail for hydrated product when AI text changed within the same revision', () => {
    const current = markEditingProductHydrated(
      createProduct({
        updatedAt: '2026-03-01T10:00:00.000Z',
        description_en: 'Old description',
      })
    );
    const incoming = createProduct({
      updatedAt: '2026-03-01T10:00:00.000Z',
      description_en: 'Fresh AI description',
    });

    const result = shouldAdoptIncomingEditProductDetail({
      currentProduct: current,
      incomingProduct: incoming,
      isEditHydrating: false,
    });

    expect(result).toBe(true);
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

describe('shouldEnableProductListBackgroundSync', () => {
  it('disables idle background sync when there is no active product work', () => {
    expect(
      shouldEnableProductListBackgroundSync({
        queuedProductIdsCount: 0,
        activeTrackedProductAiRunsCount: 0,
      })
    ).toBe(false);
  });

  it('keeps background sync enabled while queued product work remains', () => {
    expect(
      shouldEnableProductListBackgroundSync({
        queuedProductIdsCount: 1,
        activeTrackedProductAiRunsCount: 0,
      })
    ).toBe(true);
  });

  it('keeps background sync enabled while tracked AI runs remain active', () => {
    expect(
      shouldEnableProductListBackgroundSync({
        queuedProductIdsCount: 0,
        activeTrackedProductAiRunsCount: 1,
      })
    ).toBe(true);
  });
});

describe('shouldEnableProductListBackgroundSyncRuntime', () => {
  it('keeps background sync disabled before the deferred row runtime becomes ready', () => {
    expect(
      shouldEnableProductListBackgroundSyncRuntime({
        rowRuntimeReady: false,
        isLoading: false,
        queuedProductIdsCount: 1,
        activeTrackedProductAiRunsCount: 0,
      })
    ).toBe(false);
  });

  it('keeps background sync disabled while the list is still loading', () => {
    expect(
      shouldEnableProductListBackgroundSyncRuntime({
        rowRuntimeReady: true,
        isLoading: true,
        queuedProductIdsCount: 1,
        activeTrackedProductAiRunsCount: 0,
      })
    ).toBe(false);
  });

  it('enables background sync once deferred runtime is ready and work is active', () => {
    expect(
      shouldEnableProductListBackgroundSyncRuntime({
        rowRuntimeReady: true,
        isLoading: false,
        queuedProductIdsCount: 0,
        activeTrackedProductAiRunsCount: 1,
      })
    ).toBe(true);
  });
});

describe('scheduleDeferredProductListDraftBootstrap', () => {
  it('uses requestIdleCallback when available and cancels it on cleanup', () => {
    const onReady = vi.fn();
    let scheduled: (() => void) | null = null;
    const requestIdleCallback = vi.fn((callback: () => void) => {
      scheduled = callback;
      return 41;
    });
    const cancelIdleCallback = vi.fn();

    const cleanup = scheduleDeferredProductListDraftBootstrap(
      {
        requestIdleCallback,
        cancelIdleCallback,
        setTimeout: vi.fn(() => 0),
        clearTimeout: vi.fn(),
      },
      onReady
    );

    expect(requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();

    scheduled?.();
    expect(onReady).toHaveBeenCalledTimes(1);

    cleanup();
    expect(cancelIdleCallback).toHaveBeenCalledWith(41);
  });

  it('falls back to a short timeout when requestIdleCallback is unavailable', () => {
    const onReady = vi.fn();
    let scheduled: (() => void) | null = null;
    const clearTimeout = vi.fn();
    const setTimeout = vi.fn((callback: () => void, timeout?: number) => {
      scheduled = callback;
      expect(timeout).toBe(1);
      return 7;
    });

    const cleanup = scheduleDeferredProductListDraftBootstrap(
      {
        setTimeout,
        clearTimeout,
      },
      onReady
    );

    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(onReady).not.toHaveBeenCalled();

    scheduled?.();
    expect(onReady).toHaveBeenCalledTimes(1);

    cleanup();
    expect(clearTimeout).toHaveBeenCalledWith(7);
  });
});
