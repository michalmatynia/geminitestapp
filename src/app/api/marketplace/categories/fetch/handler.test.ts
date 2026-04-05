import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  fetchBaseCategoriesMock,
  fetchTraderaCategoriesForConnectionMock,
  getExternalCategoryRepositoryMock,
  getIntegrationRepositoryMock,
  resolveBaseConnectionTokenMock,
  syncFromBaseMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
} = vi.hoisted(() => ({
  fetchBaseCategoriesMock: vi.fn(),
  fetchTraderaCategoriesForConnectionMock: vi.fn(),
  getExternalCategoryRepositoryMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  syncFromBaseMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  fetchBaseCategories: fetchBaseCategoriesMock,
  getExternalCategoryRepository: getExternalCategoryRepositoryMock,
  getIntegrationRepository: getIntegrationRepositoryMock,
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
}));

vi.mock('@/features/integrations/services/tradera-listing/categories', () => ({
  fetchTraderaCategoriesForConnection: fetchTraderaCategoriesForConnectionMock,
}));

import { POST_handler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-marketplace-categories-fetch-1',
    traceId: 'trace-marketplace-categories-fetch-1',
    correlationId: 'corr-marketplace-categories-fetch-1',
    startTime: Date.now(),
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('marketplace categories fetch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getIntegrationRepositoryMock.mockResolvedValue({
      getConnectionById: getConnectionByIdMock,
      getIntegrationById: getIntegrationByIdMock,
    });
    getExternalCategoryRepositoryMock.mockReturnValue({
      syncFromBase: syncFromBaseMock,
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'conn-1',
      name: 'Connection 1',
      integrationId: 'integration-1',
      createdAt: new Date(0).toISOString(),
      updatedAt: null,
      baseApiToken: 'encrypted-token',
      baseLastInventoryId: 'inventory-1',
    });
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      name: 'Base',
      slug: 'base',
      createdAt: new Date(0).toISOString(),
      updatedAt: null,
    });
    resolveBaseConnectionTokenMock.mockReturnValue({
      token: 'base-token',
      source: 'baseApiToken',
      error: null,
    });
    fetchBaseCategoriesMock.mockResolvedValue([
      { id: 'cat-1', name: 'Category 1', parentId: null },
      { id: 'cat-2', name: 'Category 2', parentId: 'cat-1' },
    ]);
    syncFromBaseMock.mockResolvedValue(2);
  });

  it('fetches and syncs base categories for a supported connection', async () => {
    const request = new NextRequest('http://localhost/api/marketplace/categories/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST_handler(request, createContext());

    expect(response.status).toBe(200);
    expect(fetchBaseCategoriesMock).toHaveBeenCalledWith('base-token', {
      inventoryId: 'inventory-1',
    });
    expect(syncFromBaseMock).toHaveBeenCalledWith('conn-1', [
      { id: 'cat-1', name: 'Category 1', parentId: null },
      { id: 'cat-2', name: 'Category 2', parentId: 'cat-1' },
    ]);
    await expect(response.json()).resolves.toEqual({
      fetched: 2,
      total: 2,
      message: 'Successfully synced 2 categories from Base.com',
    });
  });

  it('returns an empty response when tradera returns no categories', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      name: 'Tradera',
      slug: 'tradera',
      createdAt: new Date(0).toISOString(),
      updatedAt: null,
    });
    fetchTraderaCategoriesForConnectionMock.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/marketplace/categories/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST_handler(request, createContext());

    expect(response.status).toBe(200);
    expect(fetchBaseCategoriesMock).not.toHaveBeenCalled();
    expect(syncFromBaseMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      fetched: 0,
      total: 0,
      message: 'No categories found in Tradera.',
    });
  });

  it('rejects unsupported marketplace connections before fetching categories', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      name: 'Other',
      slug: 'other',
      createdAt: new Date(0).toISOString(),
      updatedAt: null,
    });

    const request = new NextRequest('http://localhost/api/marketplace/categories/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    await expect(POST_handler(request, createContext())).rejects.toThrow(
      'Other is not yet supported for category fetch'
    );

    expect(fetchBaseCategoriesMock).not.toHaveBeenCalled();
    expect(fetchTraderaCategoriesForConnectionMock).not.toHaveBeenCalled();
    expect(syncFromBaseMock).not.toHaveBeenCalled();
  });

  it('wraps unexpected sync failures with phase metadata', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      name: 'Tradera',
      slug: 'tradera',
      createdAt: new Date(0).toISOString(),
      updatedAt: null,
    });
    fetchTraderaCategoriesForConnectionMock.mockResolvedValue([
      { id: 'cat-1', name: 'Category 1', parentId: '0' },
    ]);
    syncFromBaseMock.mockRejectedValue(new Error('mongo write failed'));

    const request = new NextRequest('http://localhost/api/marketplace/categories/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    await expect(POST_handler(request, createContext())).rejects.toMatchObject({
      message: 'Marketplace categories sync failed unexpectedly.',
      httpStatus: 500,
      code: 'INTERNAL_SERVER_ERROR',
      meta: {
        connectionId: 'conn-1',
        sourceName: 'Tradera',
        phase: 'sync',
        fetchedCount: 1,
        sampleExternalIds: ['cat-1'],
      },
    });
  });
});
