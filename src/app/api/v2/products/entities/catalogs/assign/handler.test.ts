import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  parseJsonBodyMock,
  getCatalogRepositoryMock,
  getProductRepositoryMock,
  invalidateAllMock,
  bulkReplaceProductCatalogsMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getCatalogRepositoryMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
  invalidateAllMock: vi.fn(),
  bulkReplaceProductCatalogsMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
  getCatalogRepository: getCatalogRepositoryMock,
  getProductRepository: getProductRepositoryMock,
  CachedProductService: {
    invalidateAll: invalidateAllMock,
  },
}));

import { postProductsCatalogAssignHandler } from './handler';

const buildContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-products-catalog-assign',
    startTime: Date.now(),
    userId: 'user-1',
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('product entities catalogs assign handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        productIds: ['product-1'],
        catalogIds: ['catalog-1'],
        mode: 'replace',
      },
    });
    getCatalogRepositoryMock.mockResolvedValue({
      getCatalogsByIds: vi.fn(async () => [{ id: 'catalog-1' }]),
    });
    getProductRepositoryMock.mockResolvedValue({
      bulkReplaceProductCatalogs: bulkReplaceProductCatalogsMock,
      bulkAddProductCatalogs: vi.fn(),
      bulkRemoveProductCatalogs: vi.fn(),
    });
  });

  it('invalidates cached product lists after successful catalog replacement', async () => {
    const response = await postProductsCatalogAssignHandler(
      {} as NextRequest,
      buildContext()
    );

    expect(response.status).toBe(200);
    expect(bulkReplaceProductCatalogsMock).toHaveBeenCalledWith(['product-1'], ['catalog-1']);
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
  });
});
