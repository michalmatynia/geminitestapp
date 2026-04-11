import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  parseJsonBodyMock,
  getProductRepositoryMock,
  invalidateAllMock,
  bulkSetArchivedMock,
} = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
  invalidateAllMock: vi.fn(),
  bulkSetArchivedMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/features/products/server', () => ({
  getProductRepository: getProductRepositoryMock,
  CachedProductService: {
    invalidateAll: invalidateAllMock,
  },
}));

import { POST_handler } from './handler';

const buildContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-products-archive-batch',
    startTime: Date.now(),
    userId: 'user-1',
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('products archive batch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        productIds: ['product-1', 'product-1', 'product-2'],
        archived: true,
      },
    });
    bulkSetArchivedMock.mockResolvedValue(2);
    getProductRepositoryMock.mockResolvedValue({
      bulkSetArchived: bulkSetArchivedMock,
    });
  });

  it('archives unique products and invalidates product caches', async () => {
    const response = await POST_handler({} as NextRequest, buildContext());

    expect(response.status).toBe(200);
    expect(bulkSetArchivedMock).toHaveBeenCalledWith(['product-1', 'product-2'], true);
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      archived: true,
      updated: 2,
    });
  });

  it('supports removing products from archive', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        productIds: ['product-1', 'product-2'],
        archived: false,
      },
    });

    const response = await POST_handler({} as NextRequest, buildContext());

    expect(response.status).toBe(200);
    expect(bulkSetArchivedMock).toHaveBeenCalledWith(['product-1', 'product-2'], false);
    expect(invalidateAllMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual({
      status: 'ok',
      archived: false,
      updated: 2,
    });
  });
});
