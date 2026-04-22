import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getCategoryMappingRepositoryMock,
  getExternalCategoryRepositoryMock,
  getIntegrationRepositoryMock,
  bulkUpsertMock,
  getByExternalIdMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
} = vi.hoisted(() => ({
  getCategoryMappingRepositoryMock: vi.fn(),
  getExternalCategoryRepositoryMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  bulkUpsertMock: vi.fn(),
  getByExternalIdMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/category-mapping-repository', () => ({
  getCategoryMappingRepository: getCategoryMappingRepositoryMock,
}));

vi.mock('@/features/integrations/server', () => ({
  getExternalCategoryRepository: getExternalCategoryRepositoryMock,
  getIntegrationRepository: getIntegrationRepositoryMock,
}));

import { postHandler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-mappings-bulk-1',
    traceId: 'trace-marketplace-mappings-bulk-1',
    correlationId: 'corr-marketplace-mappings-bulk-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace mappings bulk handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategoryMappingRepositoryMock.mockReturnValue({
      bulkUpsert: bulkUpsertMock,
    });
    getIntegrationRepositoryMock.mockResolvedValue({
      getConnectionById: getConnectionByIdMock,
      getIntegrationById: getIntegrationByIdMock,
    });
    getExternalCategoryRepositoryMock.mockReturnValue({
      getByExternalId: getByExternalIdMock,
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'conn-1',
      integrationId: 'integration-1',
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      slug: 'base',
    });
    bulkUpsertMock.mockResolvedValue(2);
    getByExternalIdMock.mockResolvedValue(null);
  });

  it('bulk saves mappings for non-Tradera connections', async () => {
    const request = new NextRequest('http://localhost/api/marketplace/mappings/bulk', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        catalogId: 'catalog-1',
        mappings: [
          {
            externalCategoryId: 'external-1',
            internalCategoryId: 'internal-1',
          },
          {
            externalCategoryId: 'external-2',
            internalCategoryId: null,
          },
        ],
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await postHandler(request, createContext());

    expect(response.status).toBe(200);
    expect(bulkUpsertMock).toHaveBeenCalledWith('conn-1', 'catalog-1', [
      {
        externalCategoryId: 'external-1',
        internalCategoryId: 'internal-1',
      },
      {
        externalCategoryId: 'external-2',
        internalCategoryId: null,
      },
    ]);
    await expect(response.json()).resolves.toEqual({
      success: true,
      upserted: 2,
      message: 'Successfully saved 2 category mappings',
    });
  });

  it('rejects Tradera mappings that target a parent category', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      slug: 'tradera',
    });
    getByExternalIdMock.mockResolvedValue({
      id: 'ext-2929',
      connectionId: 'conn-1',
      externalId: '2929',
      name: 'Pins & needles',
      parentExternalId: '49',
      path: 'Collectibles > Pins & needles',
      depth: 1,
      isLeaf: false,
      metadata: null,
      fetchedAt: '2026-04-08T00:00:00.000Z',
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
    });

    const request = new NextRequest('http://localhost/api/marketplace/mappings/bulk', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        catalogId: 'catalog-1',
        mappings: [
          {
            externalCategoryId: '2929',
            internalCategoryId: 'internal-1',
          },
        ],
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    await expect(postHandler(request, createContext())).rejects.toMatchObject({
      message:
        'Tradera mappings must target the deepest category. "Collectibles > Pins & needles" still has child categories. Choose a leaf Tradera category and save again.',
      httpStatus: 400,
      code: 'BAD_REQUEST',
      meta: {
        connectionId: 'conn-1',
        externalCategoryId: '2929',
      },
    });

    expect(bulkUpsertMock).not.toHaveBeenCalled();
  });
});
