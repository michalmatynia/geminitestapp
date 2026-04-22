import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getCategoryMappingRepositoryMock,
  getExternalCategoryRepositoryMock,
  getIntegrationRepositoryMock,
  listByConnectionMock,
  getByExternalCategoryMock,
  getByExternalIdMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
  updateMock,
  createMock,
} = vi.hoisted(() => ({
  getCategoryMappingRepositoryMock: vi.fn(),
  getExternalCategoryRepositoryMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  listByConnectionMock: vi.fn(),
  getByExternalCategoryMock: vi.fn(),
  getByExternalIdMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  updateMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/category-mapping-repository', () => ({
  getCategoryMappingRepository: getCategoryMappingRepositoryMock,
}));

vi.mock('@/features/integrations/server', () => ({
  getExternalCategoryRepository: getExternalCategoryRepositoryMock,
  getIntegrationRepository: getIntegrationRepositoryMock,
}));

import { getHandler, postHandler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-mappings-1',
    traceId: 'trace-marketplace-mappings-1',
    correlationId: 'corr-marketplace-mappings-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace mappings handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategoryMappingRepositoryMock.mockReturnValue({
      listByConnection: listByConnectionMock,
      getByExternalCategory: getByExternalCategoryMock,
      update: updateMock,
      create: createMock,
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
  });

  it('lists mappings for a connection and optional catalog', async () => {
    listByConnectionMock.mockResolvedValue([
      {
        id: 'mapping-1',
        connectionId: 'conn-1',
        externalCategoryId: 'external-1',
        internalCategoryId: 'internal-1',
        catalogId: 'catalog-1',
      },
    ]);

    const request = new NextRequest(
      'http://localhost/api/marketplace/mappings?connectionId=conn-1&catalogId=catalog-1'
    );

    const response = await getHandler(request, createContext());

    expect(listByConnectionMock).toHaveBeenCalledWith('conn-1', 'catalog-1');
    await expect(response.json()).resolves.toEqual([
      {
        id: 'mapping-1',
        connectionId: 'conn-1',
        externalCategoryId: 'external-1',
        internalCategoryId: 'internal-1',
        catalogId: 'catalog-1',
      },
    ]);
  });

  it('updates an existing category mapping on post', async () => {
    getByExternalCategoryMock.mockResolvedValue({
      id: 'mapping-1',
    });
    updateMock.mockResolvedValue({
      id: 'mapping-1',
      connectionId: 'conn-1',
      externalCategoryId: 'external-1',
      internalCategoryId: 'internal-2',
      catalogId: 'catalog-1',
      isActive: true,
    });

    const request = new NextRequest('http://localhost/api/marketplace/mappings', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        externalCategoryId: 'external-1',
        internalCategoryId: 'internal-2',
        catalogId: 'catalog-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await postHandler(request, createContext());

    expect(response.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith('mapping-1', {
      internalCategoryId: 'internal-2',
      isActive: true,
    });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates a new category mapping when one does not exist', async () => {
    getByExternalCategoryMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'mapping-2',
      connectionId: 'conn-1',
      externalCategoryId: 'external-2',
      internalCategoryId: 'internal-3',
      catalogId: 'catalog-1',
      isActive: true,
    });

    const request = new NextRequest('http://localhost/api/marketplace/mappings', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        externalCategoryId: 'external-2',
        internalCategoryId: 'internal-3',
        catalogId: 'catalog-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await postHandler(request, createContext());

    expect(response.status).toBe(201);
    expect(createMock).toHaveBeenCalledWith({
      connectionId: 'conn-1',
      externalCategoryId: 'external-2',
      internalCategoryId: 'internal-3',
      catalogId: 'catalog-1',
    });
    await expect(response.json()).resolves.toMatchObject({
      id: 'mapping-2',
    });
  });

  it('rejects Tradera parent-category mappings before create or update', async () => {
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

    const request = new NextRequest('http://localhost/api/marketplace/mappings', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
        externalCategoryId: '2929',
        internalCategoryId: 'internal-2',
        catalogId: 'catalog-1',
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

    expect(getByExternalCategoryMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
