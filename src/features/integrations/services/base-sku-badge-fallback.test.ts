import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  checkBaseSkuExistsMock: vi.fn(),
  fetchBaseInventoriesMock: vi.fn(),
  getExportDefaultConnectionIdMock: vi.fn(),
  getExportDefaultInventoryIdMock: vi.fn(),
  listIntegrationsMock: vi.fn(),
  listConnectionsMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  createListingMock: vi.fn(),
  listingExistsAcrossProvidersMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  updateProductMock: vi.fn(),
  aggregateToArrayMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  checkBaseSkuExists: (...args: unknown[]) => mocks.checkBaseSkuExistsMock(...args),
  fetchBaseInventories: (...args: unknown[]) => mocks.fetchBaseInventoriesMock(...args),
  getExportDefaultConnectionId: (...args: unknown[]) =>
    mocks.getExportDefaultConnectionIdMock(...args),
  getExportDefaultInventoryId: (...args: unknown[]) =>
    mocks.getExportDefaultInventoryIdMock(...args),
  getIntegrationRepository: () => ({
    listIntegrations: (...args: unknown[]) => mocks.listIntegrationsMock(...args),
    listConnections: (...args: unknown[]) => mocks.listConnectionsMock(...args),
  }),
  getProductListingRepository: async () => ({
    createListing: (...args: unknown[]) => mocks.createListingMock(...args),
  }),
  listingExistsAcrossProviders: (...args: unknown[]) =>
    mocks.listingExistsAcrossProvidersMock(...args),
  resolveBaseConnectionToken: (...args: unknown[]) =>
    mocks.resolveBaseConnectionTokenMock(...args),
}));

vi.mock('@/shared/lib/db/product-mongo-client', () => ({
  getMongoDb: async () => ({
    collection: () => ({
      aggregate: () => ({
        toArray: (...args: unknown[]) => mocks.aggregateToArrayMock(...args),
      }),
    }),
  }),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: async () => ({
    getProductById: (...args: unknown[]) => mocks.getProductByIdMock(...args),
    updateProduct: (...args: unknown[]) => mocks.updateProductMock(...args),
  }),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: (...args: unknown[]) => mocks.logSystemEventMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import {
  applyRemoteBaseSkuBadgeFallback,
  clearBaseSkuBadgeFallbackCaches,
} from './base-sku-badge-fallback';

const createProduct = (id: string, sku: string, baseProductId: string | null = null) => ({
  id,
  sku,
  baseProductId,
});

describe('base sku badge fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearBaseSkuBadgeFallbackCaches();
    mocks.listIntegrationsMock.mockResolvedValue([
      {
        id: 'integration-base',
        slug: 'baselinker',
      },
    ]);
    mocks.listConnectionsMock.mockResolvedValue([
      {
        id: 'connection-1',
        enabled: true,
        baseApiToken: 'encrypted-token',
        baseLastInventoryId: null,
      },
    ]);
    mocks.resolveBaseConnectionTokenMock.mockReturnValue({
      token: 'decrypted-token',
      source: 'baseApiToken',
      error: null,
    });
    mocks.getExportDefaultConnectionIdMock.mockResolvedValue(null);
    mocks.getExportDefaultInventoryIdMock.mockResolvedValue(null);
    mocks.aggregateToArrayMock.mockResolvedValue([
      {
        _id: {
          connectionId: 'connection-1',
          inventoryId: 'inventory-1',
        },
        count: 12,
      },
    ]);
    mocks.getProductByIdMock.mockImplementation(async (productId: string) => {
      if (productId === 'product-1') return createProduct('product-1', 'SKU-1');
      if (productId === 'product-2') return createProduct('product-2', 'SKU-2');
      return null;
    });
    mocks.checkBaseSkuExistsMock.mockImplementation(async (_token, _inventoryId, sku: string) => {
      if (sku === 'SKU-1') return { exists: true, productId: 'base-1' };
      return { exists: false };
    });
    mocks.listingExistsAcrossProvidersMock.mockResolvedValue(false);
    mocks.updateProductMock.mockResolvedValue(null);
    mocks.createListingMock.mockResolvedValue({ id: 'listing-1' });
  });

  it('fills missing Base badges by checking Base.com SKU and backfills the local link', async () => {
    const payload = await applyRemoteBaseSkuBadgeFallback({}, ['product-1', 'product-2']);

    expect(payload).toEqual({
      'product-1': {
        base: 'active',
      },
    });
    expect(mocks.checkBaseSkuExistsMock).toHaveBeenCalledWith(
      'decrypted-token',
      'inventory-1',
      'SKU-1'
    );
    expect(mocks.checkBaseSkuExistsMock).toHaveBeenCalledWith(
      'decrypted-token',
      'inventory-1',
      'SKU-2'
    );
    expect(mocks.updateProductMock).toHaveBeenCalledWith('product-1', {
      baseProductId: 'base-1',
    });
    expect(mocks.createListingMock).toHaveBeenCalledWith({
      productId: 'product-1',
      integrationId: 'integration-base',
      connectionId: 'connection-1',
      status: 'active',
      externalListingId: 'base-1',
      inventoryId: 'inventory-1',
      marketplaceData: {
        source: 'base-sku-badge-fallback',
        marketplace: 'base',
      },
    });
  });

  it('does not call Base.com for products that already have a Base badge', async () => {
    const payload = await applyRemoteBaseSkuBadgeFallback(
      {
        'product-1': {
          base: 'active',
        },
      },
      ['product-1']
    );

    expect(payload).toEqual({
      'product-1': {
        base: 'active',
      },
    });
    expect(mocks.checkBaseSkuExistsMock).not.toHaveBeenCalled();
    expect(mocks.getProductByIdMock).not.toHaveBeenCalled();
  });

  it('uses the configured default inventory before listing scope inventory', async () => {
    mocks.getExportDefaultInventoryIdMock.mockResolvedValue('inventory-default');

    await applyRemoteBaseSkuBadgeFallback({}, ['product-1']);

    expect(mocks.checkBaseSkuExistsMock).toHaveBeenCalledWith(
      'decrypted-token',
      'inventory-default',
      'SKU-1'
    );
  });
});
