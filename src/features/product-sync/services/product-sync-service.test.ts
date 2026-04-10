import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getExportDefaultConnectionIdMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  getProductListingRepositoryMock: vi.fn(),
  findProductListingByProductAndConnectionAcrossProvidersMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  callBaseApiMock: vi.fn(),
  fetchBaseProductDetailsMock: vi.fn(),
  checkBaseSkuExistsMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
}));

vi.mock('@/server/integrations', () => ({
  getExportDefaultConnectionId: () => mocks.getExportDefaultConnectionIdMock(),
  getIntegrationRepository: () => mocks.getIntegrationRepositoryMock(),
  getProductListingRepository: () => mocks.getProductListingRepositoryMock(),
  findProductListingByProductAndConnectionAcrossProviders: (...args: unknown[]) =>
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock(...args),
  resolveBaseConnectionToken: (...args: unknown[]) => mocks.resolveBaseConnectionTokenMock(...args),
  callBaseApi: (...args: unknown[]) => mocks.callBaseApiMock(...args),
  fetchBaseProductDetails: (...args: unknown[]) => mocks.fetchBaseProductDetailsMock(...args),
  checkBaseSkuExists: (...args: unknown[]) => mocks.checkBaseSkuExistsMock(...args),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: () => mocks.getProductRepositoryMock(),
}));

import { runBaseListingBackfill } from './product-sync-service';

const buildListingRepository = () => ({
  createListing: vi.fn().mockResolvedValue({ id: 'listing-1' }),
  updateListingExternalId: vi.fn().mockResolvedValue(undefined),
  updateListingInventoryId: vi.fn().mockResolvedValue(undefined),
  updateListingStatus: vi.fn().mockResolvedValue(undefined),
  updateListing: vi.fn().mockResolvedValue(undefined),
});

describe('runBaseListingBackfill', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getExportDefaultConnectionIdMock.mockResolvedValue('');
    mocks.getIntegrationRepositoryMock.mockResolvedValue({
      listIntegrations: vi.fn().mockResolvedValue([{ id: 'integration-1', slug: 'base' }]),
      listConnections: vi.fn().mockResolvedValue([
        {
          id: 'connection-1',
          integrationId: 'integration-1',
          baseApiToken: 'encrypted-token',
          baseLastInventoryId: 'inventory-1',
        },
      ]),
    });
    mocks.resolveBaseConnectionTokenMock.mockReturnValue({
      token: 'resolved-token',
      source: 'baseApiToken',
      error: null,
    });
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue(null);
    mocks.checkBaseSkuExistsMock.mockResolvedValue({
      exists: true,
      productId: 'base-123',
    });
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProducts: vi.fn().mockResolvedValue([
        {
          id: 'product-1',
          sku: 'AXESTO001',
          baseProductId: null,
          importSource: 'base',
        },
      ]),
      updateProduct: vi.fn().mockResolvedValue({
        id: 'product-1',
        baseProductId: 'base-123',
      }),
    });
  });

  it('backfills a Base listing for imported products missing persisted Base identity', async () => {
    const listingRepository = buildListingRepository();
    mocks.getProductListingRepositoryMock.mockResolvedValue(listingRepository);
    const productRepository = await mocks.getProductRepositoryMock();

    const result = await runBaseListingBackfill();

    expect(mocks.checkBaseSkuExistsMock).toHaveBeenCalledWith(
      'resolved-token',
      'inventory-1',
      'AXESTO001'
    );
    expect(productRepository.updateProduct).toHaveBeenCalledWith('product-1', {
      baseProductId: 'base-123',
    });
    expect(listingRepository.createListing).toHaveBeenCalledWith({
      productId: 'product-1',
      integrationId: 'integration-1',
      connectionId: 'connection-1',
      status: 'active',
      externalListingId: 'base-123',
      inventoryId: 'inventory-1',
      marketplaceData: {
        source: 'base-link-backfill',
        marketplace: 'base',
      },
    });
    expect(result).toEqual({
      scanned: 1,
      created: 1,
      updated: 0,
      unchanged: 0,
    });
  });
});
