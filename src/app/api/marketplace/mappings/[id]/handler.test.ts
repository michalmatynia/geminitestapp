import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getCategoryMappingRepositoryMock,
  getExternalCategoryRepositoryMock,
  getIntegrationRepositoryMock,
  getByIdMock,
  updateMock,
  deleteMock,
  getByExternalIdMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
} = vi.hoisted(() => ({
  getCategoryMappingRepositoryMock: vi.fn(),
  getExternalCategoryRepositoryMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  getByIdMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
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

import { deleteHandler, getHandler, putHandler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-mapping-by-id-1',
    traceId: 'trace-marketplace-mapping-by-id-1',
    correlationId: 'corr-marketplace-mapping-by-id-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace mapping by-id handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategoryMappingRepositoryMock.mockReturnValue({
      getById: getByIdMock,
      update: updateMock,
      delete: deleteMock,
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
    getByExternalIdMock.mockResolvedValue(null);
    getByIdMock.mockResolvedValue({
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalCategoryId: 'ext-1',
      internalCategoryId: 'internal-1',
      catalogId: 'catalog-1',
      isActive: true,
    });
  });

  it('exports the supported handlers', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof putHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
  });

  it('rejects reactivating a Tradera mapping that points to a parent category', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      slug: 'tradera',
    });
    getByIdMock.mockResolvedValue({
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalCategoryId: '2929',
      internalCategoryId: 'internal-1',
      catalogId: 'catalog-1',
      isActive: false,
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

    const request = new NextRequest('http://localhost/api/marketplace/mappings/mapping-1', {
      method: 'PUT',
      body: JSON.stringify({
        isActive: true,
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    await expect(
      putHandler(request, createContext(), { id: 'mapping-1' })
    ).rejects.toMatchObject({
      message:
        'Tradera mappings must target the deepest category. "Collectibles > Pins & needles" still has child categories. Choose a leaf Tradera category and save again.',
      httpStatus: 400,
      code: 'BAD_REQUEST',
      meta: {
        connectionId: 'conn-1',
        externalCategoryId: '2929',
      },
    });

    expect(updateMock).not.toHaveBeenCalled();
  });
});
