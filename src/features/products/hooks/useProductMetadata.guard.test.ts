// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  logClientError: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => mocks.logClientError(...args),
}));

vi.mock('./editingProductHydration', () => ({
  isEditingProductHydrated: () => true,
}));

import { useProductMetadataFormGuard } from './useProductMetadata.guard';
import type { Language } from '@/shared/contracts/internationalization';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const makeLanguage = (id: string, code: string): Language =>
  ({ id, code, name: code, isDefault: false }) as Language;

const makeCatalog = (id: string, languageIds: string[] = []): CatalogRecord =>
  ({ id, name: id, languageIds, priceGroupIds: [] }) as CatalogRecord;

const stubProduct = { id: 'product-1' } as ProductWithImages;

const baseProps = {
  catalogs: [makeCatalog('cat-1', ['pl'])],
  catalogsReady: true,
  languages: [makeLanguage('pl', 'pl')],
  languagesReady: true,
  product: stubProduct,
  selectedCatalogIds: ['cat-1'],
};

describe('useProductMetadataFormGuard', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not log when filteredLanguages is non-empty', () => {
    renderHook(() =>
      useProductMetadataFormGuard({ ...baseProps, filteredLanguages: [makeLanguage('pl', 'pl')] })
    );
    expect(mocks.logClientError).not.toHaveBeenCalled();
  });

  it('does not log when product is undefined', () => {
    renderHook(() =>
      useProductMetadataFormGuard({
        ...baseProps,
        product: undefined,
        filteredLanguages: [],
      })
    );
    expect(mocks.logClientError).not.toHaveBeenCalled();
  });

  it('does not log when catalogsReady is false', () => {
    renderHook(() =>
      useProductMetadataFormGuard({
        ...baseProps,
        catalogsReady: false,
        filteredLanguages: [],
      })
    );
    expect(mocks.logClientError).not.toHaveBeenCalled();
  });

  it('does not log when languagesReady is false', () => {
    renderHook(() =>
      useProductMetadataFormGuard({
        ...baseProps,
        languagesReady: false,
        filteredLanguages: [],
      })
    );
    expect(mocks.logClientError).not.toHaveBeenCalled();
  });

  it('does not log when selectedCatalogIds is empty', () => {
    renderHook(() =>
      useProductMetadataFormGuard({
        ...baseProps,
        selectedCatalogIds: [],
        filteredLanguages: [],
      })
    );
    expect(mocks.logClientError).not.toHaveBeenCalled();
  });

  it('does not log when languages is empty (stale empty cache scenario)', () => {
    // isSuccess=true but data=[] — happens when React Query cache has a stale empty response.
    // This is a false positive; the guard should stay silent and let the query refetch.
    renderHook(() =>
      useProductMetadataFormGuard({
        ...baseProps,
        languages: [],
        filteredLanguages: [],
      })
    );
    expect(mocks.logClientError).not.toHaveBeenCalled();
  });

  it('logs when queries are ready, languages exist, catalog is selected, but filteredLanguages is empty', () => {
    renderHook(() =>
      useProductMetadataFormGuard({
        ...baseProps,
        filteredLanguages: [],
      })
    );
    expect(mocks.logClientError).toHaveBeenCalledOnce();
    const [error, meta] = mocks.logClientError.mock.calls[0] as [Error, { context: Record<string, unknown> }];
    expect(error.message).toBe('[ProductForm] filteredLanguages empty after queries resolved');
    expect(meta.context).toMatchObject({
      productId: 'product-1',
      selectedCatalogIds: ['cat-1'],
      languagesCount: 1,
    });
  });
});
