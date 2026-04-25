import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  fetchBaseCategoriesMock,
  fetchTraderaCategoriesFromListingFormForConnectionMock,
  getExternalCategoryRepositoryMock,
  getIntegrationRepositoryMock,
  resolveBaseConnectionTokenMock,
  syncFromBaseMock,
  listByConnectionMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
  loadTraderaSystemSettingsMock,
} = vi.hoisted(() => ({
  fetchBaseCategoriesMock: vi.fn(),
  fetchTraderaCategoriesFromListingFormForConnectionMock: vi.fn(),
  getExternalCategoryRepositoryMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  syncFromBaseMock: vi.fn(),
  listByConnectionMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
  loadTraderaSystemSettingsMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  fetchBaseCategories: fetchBaseCategoriesMock,
  getExternalCategoryRepository: getExternalCategoryRepositoryMock,
  getIntegrationRepository: getIntegrationRepositoryMock,
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
}));

vi.mock('@/features/integrations/services/tradera-listing/categories', () => ({
  fetchTraderaCategoriesFromListingFormForConnection:
    fetchTraderaCategoriesFromListingFormForConnectionMock,
}));

vi.mock('@/features/integrations/services/tradera-system-settings', () => ({
  loadTraderaSystemSettings: loadTraderaSystemSettingsMock,
}));

import { postHandler } from './handler';

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
    loadTraderaSystemSettingsMock.mockResolvedValue({
      defaultDurationHours: 72,
      autoRelistEnabled: true,
      autoRelistLeadMinutes: 180,
      schedulerEnabled: false,
      schedulerIntervalMs: 300000,
      allowSimulatedSuccess: false,
      listingFormUrl: 'https://www.tradera.com/en/selling/new',
      selectorProfile: 'default',
    });
    getIntegrationRepositoryMock.mockReturnValue({
      getConnectionById: getConnectionByIdMock,
      getIntegrationById: getIntegrationByIdMock,
    });
    getExternalCategoryRepositoryMock.mockReturnValue({
      syncFromBase: syncFromBaseMock,
      listByConnection: listByConnectionMock,
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
    listByConnectionMock.mockResolvedValue([]);
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

    const response = await postHandler(request, createContext());

    expect(response.status).toBe(200);
    expect(fetchBaseCategoriesMock).toHaveBeenCalledWith('base-token', {
      inventoryId: 'inventory-1',
    });
    expect(syncFromBaseMock).toHaveBeenCalledWith('conn-1', [
      {
        id: 'cat-1',
        name: 'Category 1',
        parentId: null,
        metadata: {
          categoryFetchSource: 'Base.com',
        },
      },
      {
        id: 'cat-2',
        name: 'Category 2',
        parentId: 'cat-1',
        metadata: {
          categoryFetchSource: 'Base.com',
        },
      },
    ]);
    await expect(response.json()).resolves.toEqual({
      fetched: 2,
      total: 2,
      message: 'Successfully synced 2 categories from Base.com (roots: 1, max depth: 1).',
      source: 'Base.com',
      categoryStats: {
        rootCount: 1,
        withParentCount: 1,
        maxDepth: 1,
        depthHistogram: {
          '0': 1,
          '1': 1,
        },
      },
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
    fetchTraderaCategoriesFromListingFormForConnectionMock.mockResolvedValue([]);

    const request = new NextRequest('http://localhost/api/marketplace/categories/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await postHandler(request, createContext());

    expect(response.status).toBe(200);
    expect(fetchBaseCategoriesMock).not.toHaveBeenCalled();
    expect(syncFromBaseMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      fetched: 0,
      total: 0,
      message: 'No categories found in Tradera listing form picker.',
      source: 'Tradera listing form picker',
      categoryStats: {
        rootCount: 0,
        withParentCount: 0,
        maxDepth: 0,
        depthHistogram: {},
      },
    });
  });

  it('syncs deep Tradera listing form categories and reports the fetched depth', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      name: 'Tradera',
      slug: 'tradera',
      createdAt: new Date(0).toISOString(),
      updatedAt: null,
    });
    fetchTraderaCategoriesFromListingFormForConnectionMock.mockResolvedValue([
      { id: '49', name: 'Collectibles', parentId: '0' },
      { id: '2929', name: 'Pins & Needles', parentId: '49' },
      { id: '292903', name: 'Pins', parentId: '2929' },
      { id: '292904', name: 'Other pins & needles', parentId: '292903' },
    ]);
    syncFromBaseMock.mockResolvedValue(4);

    const request = new NextRequest('http://localhost/api/marketplace/categories/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await postHandler(request, createContext());

    expect(response.status).toBe(200);
    expect(fetchTraderaCategoriesFromListingFormForConnectionMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'conn-1' }),
      { listingFormUrl: 'https://www.tradera.com/en/selling/new' }
    );
    expect(syncFromBaseMock).toHaveBeenCalledWith('conn-1', [
      {
        id: '49',
        name: 'Collectibles',
        parentId: '0',
        metadata: { categoryFetchSource: 'Tradera listing form picker' },
      },
      {
        id: '2929',
        name: 'Pins & Needles',
        parentId: '49',
        metadata: { categoryFetchSource: 'Tradera listing form picker' },
      },
      {
        id: '292903',
        name: 'Pins',
        parentId: '2929',
        metadata: { categoryFetchSource: 'Tradera listing form picker' },
      },
      {
        id: '292904',
        name: 'Other pins & needles',
        parentId: '292903',
        metadata: { categoryFetchSource: 'Tradera listing form picker' },
      },
    ]);
    await expect(response.json()).resolves.toEqual({
      fetched: 4,
      total: 4,
      message:
        'Successfully synced 4 categories from Tradera listing form picker (roots: 1, max depth: 3).',
      source: 'Tradera listing form picker',
      categoryStats: {
        rootCount: 1,
        withParentCount: 3,
        maxDepth: 3,
        depthHistogram: {
          '0': 1,
          '1': 1,
          '2': 1,
          '3': 1,
        },
      },
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

    await expect(postHandler(request, createContext())).rejects.toThrow(
      'Other is not yet supported for category fetch'
    );

    expect(fetchBaseCategoriesMock).not.toHaveBeenCalled();
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
    fetchTraderaCategoriesFromListingFormForConnectionMock.mockResolvedValue([
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

    await expect(postHandler(request, createContext())).rejects.toMatchObject({
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
    expect(syncFromBaseMock).toHaveBeenCalledWith('conn-1', [
      {
        id: 'cat-1',
        name: 'Category 1',
        parentId: '0',
        metadata: {
          categoryFetchSource: 'Tradera listing form picker',
        },
      },
    ]);
  });

  it('keeps existing deeper Tradera categories when listing form fetch returns a shallower tree', async () => {
    getIntegrationByIdMock.mockResolvedValue({
      id: 'integration-1',
      name: 'Tradera',
      slug: 'tradera',
      createdAt: new Date(0).toISOString(),
      updatedAt: null,
    });
    fetchTraderaCategoriesFromListingFormForConnectionMock.mockResolvedValue([
      { id: '49', name: 'Collectibles', parentId: '0' },
      { id: '2929', name: 'Pins & needles', parentId: '49' },
    ]);
    listByConnectionMock.mockResolvedValue([
      {
        id: 'stored-root',
        connectionId: 'conn-1',
        externalId: '49',
        name: 'Collectibles',
        parentExternalId: null,
        path: 'Collectibles',
        depth: 0,
        isLeaf: false,
        metadata: { categoryFetchSource: 'Tradera listing form picker' },
        fetchedAt: '2026-04-08T00:00:00.000Z',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'stored-parent',
        connectionId: 'conn-1',
        externalId: '2929',
        name: 'Pins & needles',
        parentExternalId: '49',
        path: 'Collectibles > Pins & needles',
        depth: 1,
        isLeaf: false,
        metadata: { categoryFetchSource: 'Tradera listing form picker' },
        fetchedAt: '2026-04-08T00:00:00.000Z',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
      {
        id: 'stored-leaf',
        connectionId: 'conn-1',
        externalId: '292904',
        name: 'Other pins & needles',
        parentExternalId: '2929',
        path: 'Collectibles > Pins & needles > Other pins & needles',
        depth: 2,
        isLeaf: true,
        metadata: { categoryFetchSource: 'Tradera listing form picker' },
        fetchedAt: '2026-04-08T00:00:00.000Z',
        createdAt: '2026-04-08T00:00:00.000Z',
        updatedAt: '2026-04-08T00:00:00.000Z',
      },
    ]);

    const request = new NextRequest('http://localhost/api/marketplace/categories/fetch', {
      method: 'POST',
      body: JSON.stringify({
        connectionId: 'conn-1',
      }),
      headers: {
        'content-type': 'application/json',
      },
    });

    await expect(postHandler(request, createContext())).rejects.toMatchObject({
      message:
        'Tradera listing form picker returned a shallower category tree than the categories already stored. Existing categories were kept. Ensure the connection session is authenticated, then retry category fetch.',
      httpStatus: 422,
      code: 'UNPROCESSABLE_ENTITY',
      meta: {
        connectionId: 'conn-1',
        sourceName: 'Tradera listing form picker',
        existingTotal: 3,
        existingMaxDepth: 2,
        fetchedTotal: 2,
        fetchedMaxDepth: 1,
      },
    });

    expect(syncFromBaseMock).not.toHaveBeenCalled();
  });
});
