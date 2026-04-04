import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  IntegrationConnectionRecord,
  IntegrationRecord,
} from '@/shared/contracts/integrations';

const {
  fetchBaseCategoriesMock,
  fetchTraderaCategoriesForConnectionMock,
  resolveBaseConnectionTokenMock,
} = vi.hoisted(() => ({
  fetchBaseCategoriesMock: vi.fn(),
  fetchTraderaCategoriesForConnectionMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  fetchBaseCategories: fetchBaseCategoriesMock,
  fetchTraderaCategoriesForConnection: fetchTraderaCategoriesForConnectionMock,
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
}));

import {
  buildEmptyMarketplaceCategoryFetchResponse,
  buildMarketplaceCategoryFetchResponse,
  fetchMarketplaceCategories,
  requireMarketplaceConnectionId,
  resolveMarketplaceCategoryFetchContext,
  type CategoryFetchIntegrationRepository,
} from './handler.helpers';

const createConnection = (
  overrides: Partial<IntegrationConnectionRecord> = {}
): IntegrationConnectionRecord => ({
  id: 'conn-1',
  name: 'Connection 1',
  integrationId: 'integration-1',
  createdAt: new Date(0).toISOString(),
  updatedAt: null,
  baseApiToken: 'encrypted-token',
  baseLastInventoryId: 'inventory-1',
  ...overrides,
});

const createIntegration = (overrides: Partial<IntegrationRecord> = {}): IntegrationRecord => ({
  id: 'integration-1',
  name: 'Base',
  slug: 'base',
  createdAt: new Date(0).toISOString(),
  updatedAt: null,
  ...overrides,
});

describe('marketplace categories fetch helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveBaseConnectionTokenMock.mockReturnValue({
      token: 'base-token',
      source: 'baseApiToken',
      error: null,
    });
  });

  it('requires a non-empty connection id', () => {
    expect(requireMarketplaceConnectionId({ connectionId: 'conn-1' })).toBe('conn-1');
    expect(() => requireMarketplaceConnectionId({ connectionId: '' })).toThrow(
      'connectionId is required'
    );
  });

  it('resolves and fetches base marketplace categories', async () => {
    const integrationRepo: CategoryFetchIntegrationRepository = {
      getConnectionById: vi.fn().mockResolvedValue(createConnection()),
      getIntegrationById: vi.fn().mockResolvedValue(createIntegration()),
    };
    fetchBaseCategoriesMock.mockResolvedValue([
      { id: 'cat-1', name: 'Category 1', parentId: null },
    ]);

    const context = await resolveMarketplaceCategoryFetchContext(integrationRepo, 'conn-1');

    expect(context).toMatchObject({
      connectionId: 'conn-1',
      inventoryId: 'inventory-1',
      sourceName: 'Base.com',
      token: 'base-token',
      mode: 'base',
    });
    await expect(fetchMarketplaceCategories(context)).resolves.toEqual([
      { id: 'cat-1', name: 'Category 1', parentId: null },
    ]);
    expect(fetchBaseCategoriesMock).toHaveBeenCalledWith('base-token', {
      inventoryId: 'inventory-1',
    });
  });

  it('resolves tradera contexts, builds responses, and rejects unsupported integrations', async () => {
    const traderaRepo: CategoryFetchIntegrationRepository = {
      getConnectionById: vi.fn().mockResolvedValue(createConnection()),
      getIntegrationById: vi.fn().mockResolvedValue(
        createIntegration({ name: 'Tradera', slug: 'tradera' })
      ),
    };
    fetchTraderaCategoriesForConnectionMock.mockResolvedValue([
      { id: 'cat-2', name: 'Category 2', parentId: '0' },
    ]);

    const traderaContext = await resolveMarketplaceCategoryFetchContext(traderaRepo, 'conn-1');
    expect(traderaContext).toMatchObject({
      connectionId: 'conn-1',
      sourceName: 'Tradera',
      mode: 'tradera',
    });
    await expect(fetchMarketplaceCategories(traderaContext)).resolves.toEqual([
      { id: 'cat-2', name: 'Category 2', parentId: '0' },
    ]);

    const unsupportedRepo: CategoryFetchIntegrationRepository = {
      getConnectionById: vi.fn().mockResolvedValue(createConnection()),
      getIntegrationById: vi.fn().mockResolvedValue(
        createIntegration({ name: 'Other', slug: 'other' })
      ),
    };

    await expect(resolveMarketplaceCategoryFetchContext(unsupportedRepo, 'conn-1')).rejects.toThrow(
      'Other is not yet supported for category fetch'
    );

    expect(buildEmptyMarketplaceCategoryFetchResponse('Tradera')).toEqual({
      fetched: 0,
      total: 0,
      message: 'No categories found in Tradera.',
    });
    expect(buildMarketplaceCategoryFetchResponse('Base.com', 2, 3)).toEqual({
      fetched: 2,
      total: 3,
      message: 'Successfully synced 2 categories from Base.com',
    });
  });
});
