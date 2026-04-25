import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  IntegrationConnectionRecord,
  IntegrationLookupRepository,
  IntegrationRecord,
} from '@/shared/contracts/integrations/repositories';

const {
  fetchBaseCategoriesMock,
  fetchTraderaCategoriesFromListingFormForConnectionMock,
  resolveBaseConnectionTokenMock,
  loadTraderaSystemSettingsMock,
} = vi.hoisted(() => ({
  fetchBaseCategoriesMock: vi.fn(),
  fetchTraderaCategoriesFromListingFormForConnectionMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  loadTraderaSystemSettingsMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  fetchBaseCategories: fetchBaseCategoriesMock,
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
}));

vi.mock('@/features/integrations/services/tradera-listing/categories', () => ({
  fetchTraderaCategoriesFromListingFormForConnection:
    fetchTraderaCategoriesFromListingFormForConnectionMock,
}));

vi.mock('@/features/integrations/services/tradera-system-settings', () => ({
  loadTraderaSystemSettings: loadTraderaSystemSettingsMock,
}));

import {
  buildMarketplaceCategoryStats,
  buildEmptyMarketplaceCategoryFetchResponse,
  buildMarketplaceCategoryFetchResponse,
  fetchMarketplaceCategories,
  requireMarketplaceConnectionId,
  resolveMarketplaceCategoryFetchContext,
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
  });

  it('requires a non-empty connection id', () => {
    expect(requireMarketplaceConnectionId({ connectionId: 'conn-1' })).toBe('conn-1');
    expect(() => requireMarketplaceConnectionId({ connectionId: '' })).toThrow(
      'connectionId is required'
    );
  });

  it('resolves and fetches base marketplace categories', async () => {
    const integrationRepo: IntegrationLookupRepository = {
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
      responseSourceName: 'Base.com',
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
    // Browser connection defaults to the authenticated listing form picker
    const traderaRepo: IntegrationLookupRepository = {
      getConnectionById: vi.fn().mockResolvedValue(createConnection()),
      getIntegrationById: vi.fn().mockResolvedValue(
        createIntegration({ name: 'Tradera', slug: 'tradera' })
      ),
    };
    const traderaContext = await resolveMarketplaceCategoryFetchContext(traderaRepo, 'conn-1');
    expect(traderaContext).toMatchObject({
      connectionId: 'conn-1',
      sourceName: 'Tradera',
      responseSourceName: 'Tradera listing form picker',
      mode: 'tradera-listing-form',
    });
    fetchTraderaCategoriesFromListingFormForConnectionMock.mockResolvedValue([
      { id: 'cat-2', name: 'Category 2', parentId: '0' },
    ]);
    await expect(fetchMarketplaceCategories(traderaContext)).resolves.toEqual([
      { id: 'cat-2', name: 'Category 2', parentId: '0' },
    ]);

    const unsupportedRepo: IntegrationLookupRepository = {
      getConnectionById: vi.fn().mockResolvedValue(createConnection()),
      getIntegrationById: vi.fn().mockResolvedValue(
        createIntegration({ name: 'Other', slug: 'other' })
      ),
    };

    await expect(resolveMarketplaceCategoryFetchContext(unsupportedRepo, 'conn-1')).rejects.toThrow(
      'Other is not yet supported for category fetch'
    );

    expect(buildEmptyMarketplaceCategoryFetchResponse('Tradera listing form picker')).toEqual({
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
    expect(
      buildMarketplaceCategoryStats([
        { id: '49', name: 'Collectibles', parentId: null },
        { id: '2929', name: 'Pins & needles', parentId: '49' },
        { id: '292904', name: 'Other pins & needles', parentId: '2929' },
      ])
    ).toEqual({
      rootCount: 1,
      withParentCount: 2,
      maxDepth: 2,
      depthHistogram: {
        '0': 1,
        '1': 1,
        '2': 1,
      },
    });
    expect(
      buildMarketplaceCategoryFetchResponse('Base.com', 2, 3, {
        rootCount: 1,
        withParentCount: 2,
        maxDepth: 2,
        depthHistogram: {
          '0': 1,
          '1': 1,
          '2': 1,
        },
      })
    ).toEqual({
      fetched: 2,
      total: 3,
      message: 'Successfully synced 2 categories from Base.com (roots: 1, max depth: 2).',
      source: 'Base.com',
      categoryStats: {
        rootCount: 1,
        withParentCount: 2,
        maxDepth: 2,
        depthHistogram: {
          '0': 1,
          '1': 1,
          '2': 1,
        },
      },
    });
  });

});
