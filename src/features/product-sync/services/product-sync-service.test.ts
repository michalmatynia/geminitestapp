import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getExportDefaultConnectionIdMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  getProductListingRepositoryMock: vi.fn(),
  findProductListingByProductAndConnectionAcrossProvidersMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  callBaseApiMock: vi.fn(),
  fetchBaseProductDetailsMock: vi.fn(),
  fetchBaseWarehousesMock: vi.fn(),
  checkBaseSkuExistsMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  getDefaultProductSyncProfileMock: vi.fn(),
  getProductSyncProfileMock: vi.fn(),
  hasActiveProductSyncRunMock: vi.fn(),
  putProductSyncRunItemMock: vi.fn(),
  touchProductSyncProfileLastRunAtMock: vi.fn(),
  updateProductSyncRunMock: vi.fn(),
  updateProductSyncRunStatusMock: vi.fn(),
  getProductSyncRunMock: vi.fn(),
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
  fetchBaseWarehouses: (...args: unknown[]) => mocks.fetchBaseWarehousesMock(...args),
  checkBaseSkuExists: (...args: unknown[]) => mocks.checkBaseSkuExistsMock(...args),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: () => mocks.getProductRepositoryMock(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: () => mocks.getMongoDbMock(),
}));

vi.mock('@/features/product-sync/services/product-sync-repository', () => ({
  getDefaultProductSyncProfile: () => mocks.getDefaultProductSyncProfileMock(),
  getProductSyncProfile: () => mocks.getProductSyncProfileMock(),
  hasActiveProductSyncRun: () => mocks.hasActiveProductSyncRunMock(),
  putProductSyncRunItem: (...args: unknown[]) => mocks.putProductSyncRunItemMock(...args),
  touchProductSyncProfileLastRunAt: (...args: unknown[]) =>
    mocks.touchProductSyncProfileLastRunAtMock(...args),
  updateProductSyncRun: (...args: unknown[]) => mocks.updateProductSyncRunMock(...args),
  updateProductSyncRunStatus: (...args: unknown[]) => mocks.updateProductSyncRunStatusMock(...args),
  getProductSyncRun: (...args: unknown[]) => mocks.getProductSyncRunMock(...args),
}));

import {
  getProductBaseSyncPreview,
  processProductSyncRun,
  runBaseListingBackfill,
  runProductBaseSync,
} from './product-sync-service';

const buildListingRepository = () => ({
  createListing: vi.fn().mockResolvedValue({ id: 'listing-1' }),
  updateListingExternalId: vi.fn().mockResolvedValue(undefined),
  updateListingInventoryId: vi.fn().mockResolvedValue(undefined),
  updateListingStatus: vi.fn().mockResolvedValue(undefined),
  updateListing: vi.fn().mockResolvedValue(undefined),
});

describe('product-sync-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getExportDefaultConnectionIdMock.mockResolvedValue('');
    mocks.getIntegrationRepositoryMock.mockResolvedValue({
      getConnectionById: vi.fn().mockResolvedValue({
        id: 'connection-1',
        name: 'Main Base Connection',
        integrationId: 'integration-1',
        baseApiToken: 'encrypted-token',
      }),
      getIntegrationById: vi.fn().mockResolvedValue({
        id: 'integration-1',
        slug: 'base',
      }),
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
    mocks.getDefaultProductSyncProfileMock.mockResolvedValue({
      id: 'profile-1',
      name: 'Base Product Sync',
      isDefault: true,
      enabled: true,
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: null,
      scheduleIntervalMinutes: 30,
      batchSize: 100,
      conflictPolicy: 'skip',
      fieldRules: [
        {
          id: 'rule-name',
          appField: 'name_en',
          baseField: 'text_fields.name',
          direction: 'app_to_base',
        },
        {
          id: 'rule-stock',
          appField: 'stock',
          baseField: 'stock',
          direction: 'base_to_app',
        },
      ],
      lastRunAt: null,
      createdAt: '2026-04-11T10:00:00.000Z',
      updatedAt: '2026-04-11T10:00:00.000Z',
    });
    mocks.hasActiveProductSyncRunMock.mockResolvedValue(false);
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
      getProductById: vi.fn().mockResolvedValue({
        id: 'product-1',
        name_en: 'App title',
        description_en: 'App description',
        stock: 5,
        price: 123,
        sku: 'AXESTO001',
        ean: 'EAN-1',
        weight: 100,
        baseProductId: null,
        importSource: 'base',
      }),
      updateProduct: vi.fn().mockResolvedValue({
        id: 'product-1',
        baseProductId: 'base-123',
      }),
    });
    mocks.fetchBaseProductDetailsMock.mockResolvedValue([
      {
        product_id: 'base-123',
        stock: 8,
        text_fields: {
          name: 'Base title',
          description: 'Base description',
        },
      },
    ]);
    mocks.fetchBaseWarehousesMock.mockResolvedValue([]);
    mocks.getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'price_groups') {
          return {
            find: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
            })),
          };
        }
        if (name === 'currencies') {
          return {
            find: vi.fn(() => ({
              toArray: vi.fn().mockResolvedValue([]),
            })),
          };
        }
        return {
          find: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue([]),
          })),
        };
      }),
    });
    mocks.callBaseApiMock.mockResolvedValue({ status: 'SUCCESS' });
    mocks.getProductSyncRunMock.mockResolvedValue({
      id: 'run-1',
      profileId: 'profile-1',
      profileName: 'Base Product Sync',
      trigger: 'scheduled',
      status: 'queued',
      queueJobId: null,
      startedAt: null,
      finishedAt: null,
      summaryMessage: null,
      errorMessage: null,
      stats: {
        total: 0,
        processed: 0,
        success: 0,
        skipped: 0,
        failed: 0,
        localUpdated: 0,
        baseUpdated: 0,
      },
      createdAt: '2026-04-11T10:00:00.000Z',
      updatedAt: '2026-04-11T10:00:00.000Z',
    });
    mocks.getProductSyncProfileMock.mockResolvedValue({
      id: 'profile-1',
      name: 'Base Product Sync',
      isDefault: true,
      enabled: true,
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: null,
      scheduleIntervalMinutes: 30,
      batchSize: 100,
      conflictPolicy: 'skip',
      fieldRules: [
        {
          id: 'rule-name',
          appField: 'name_en',
          baseField: 'text_fields.name',
          direction: 'app_to_base',
        },
        {
          id: 'rule-stock',
          appField: 'stock',
          baseField: 'stock',
          direction: 'base_to_app',
        },
      ],
      lastRunAt: null,
      createdAt: '2026-04-11T10:00:00.000Z',
      updatedAt: '2026-04-11T10:00:00.000Z',
    });
    mocks.updateProductSyncRunStatusMock.mockImplementation(
      async (
        runId: string,
        status: string,
        patch: Record<string, unknown> = {}
      ) => ({
        id: runId,
        profileId: 'profile-1',
        profileName: 'Base Product Sync',
        trigger: 'scheduled',
        status,
        queueJobId: null,
        startedAt:
          status === 'running' || status === 'completed' || status === 'partial_success'
            ? '2026-04-11T10:05:00.000Z'
            : null,
        finishedAt:
          status === 'completed' || status === 'partial_success' || status === 'failed'
            ? '2026-04-11T10:06:00.000Z'
            : null,
        summaryMessage: null,
        errorMessage: null,
        stats: {
          total: 0,
          processed: 0,
          success: 0,
          skipped: 0,
          failed: 0,
          localUpdated: 0,
          baseUpdated: 0,
          ...(patch['stats'] as Record<string, number> | undefined),
        },
        createdAt: '2026-04-11T10:00:00.000Z',
        updatedAt: '2026-04-11T10:06:00.000Z',
        ...patch,
      })
    );
    mocks.updateProductSyncRunMock.mockResolvedValue(undefined);
    mocks.putProductSyncRunItemMock.mockResolvedValue(undefined);
    mocks.touchProductSyncProfileLastRunAtMock.mockResolvedValue(undefined);
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

  it('builds a manual Base sync preview with real directions and differences', async () => {
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        externalListingId: 'base-123',
      },
    });

    const preview = await getProductBaseSyncPreview('product-1');

    expect(preview?.canSync).toBe(true);
    expect(preview?.linkedBaseProductId).toBe('base-123');
    expect(preview?.profile?.isDefault).toBe(true);
    expect(preview?.profile?.connectionName).toBe('Main Base Connection');
    expect(preview?.fields.find((field) => field.appField === 'name_en')).toMatchObject({
      baseFieldLabel: 'Product name (text_fields.name)',
      baseFieldDescription: 'Name inside text_fields object.',
      direction: 'app_to_base',
      willWriteToBase: true,
    });
    expect(preview?.fields.find((field) => field.appField === 'stock')).toMatchObject({
      baseFieldLabel: 'Inventory stock (stock)',
      baseFieldDescription: 'Inventory-level stock (no warehouse).',
      direction: 'base_to_app',
      willWriteToApp: true,
    });
  });

  it('builds enriched preview labels for dynamic warehouse and price-group paths', async () => {
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        externalListingId: 'base-123',
      },
    });
    mocks.getDefaultProductSyncProfileMock.mockResolvedValue({
      id: 'profile-1',
      name: 'Base Product Sync',
      isDefault: true,
      enabled: true,
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: null,
      scheduleIntervalMinutes: 30,
      batchSize: 100,
      conflictPolicy: 'skip',
      fieldRules: [
        {
          id: 'rule-stock-warehouse',
          appField: 'stock',
          baseField: 'stock.bl_1',
          direction: 'base_to_app',
        },
        {
          id: 'rule-price-group',
          appField: 'price',
          baseField: 'prices.EUR_RETAIL',
          direction: 'app_to_base',
        },
      ],
      lastRunAt: null,
      createdAt: '2026-04-11T10:00:00.000Z',
      updatedAt: '2026-04-11T10:00:00.000Z',
    });
    mocks.fetchBaseWarehousesMock.mockResolvedValue([
      {
        id: '1',
        typedId: 'bl_1',
        name: 'Main Warehouse',
        is_default: true,
      },
    ]);
    const priceGroupsFindMock = vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue([
        {
          id: 'pg-eur',
          groupId: 'EUR_RETAIL',
          name: 'Retail EUR',
          currencyId: 'currency-eur',
          isDefault: false,
        },
      ]),
    }));
    const currenciesFindMock = vi.fn(() => ({
      toArray: vi.fn().mockResolvedValue([
        {
          id: 'currency-eur',
          code: 'EUR',
        },
      ]),
    }));
    mocks.getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'price_groups') {
          return {
            find: priceGroupsFindMock,
          };
        }
        if (name === 'currencies') {
          return {
            find: currenciesFindMock,
          };
        }
        return {
          find: vi.fn(() => ({
            toArray: vi.fn().mockResolvedValue([]),
          })),
        };
      }),
    });
    mocks.fetchBaseProductDetailsMock.mockResolvedValue([
      {
        product_id: 'base-123',
        stock: {
          bl_1: 8,
        },
        prices: {
          EUR_RETAIL: 199,
        },
      },
    ]);

    const preview = await getProductBaseSyncPreview('product-1');

    expect(preview?.fields.find((field) => field.appField === 'stock')).toMatchObject({
      baseField: 'stock.bl_1',
      baseFieldLabel: 'Warehouse stock: Main Warehouse (bl_1)',
      baseFieldDescription: 'Stock for Base.com warehouse Main Warehouse (bl_1) [default].',
    });
    expect(preview?.fields.find((field) => field.appField === 'price')).toMatchObject({
      baseField: 'prices.EUR_RETAIL',
      baseFieldLabel: 'Price group: Retail EUR (EUR_RETAIL)',
      baseFieldDescription: 'Price for Base.com price group Retail EUR (EUR_RETAIL) [EUR].',
    });
    expect(mocks.fetchBaseWarehousesMock).toHaveBeenCalledWith('resolved-token', 'inventory-1');
  });

  it('builds a manual Base sync preview from Base import SKU when no direct link exists yet', async () => {
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue(null);
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue({
        id: 'product-1',
        name_en: 'App title',
        description_en: 'App description',
        stock: 5,
        price: 123,
        sku: 'AXESTO001',
        ean: 'EAN-1',
        weight: 100,
        baseProductId: null,
        importSource: 'base',
      }),
    });

    const preview = await getProductBaseSyncPreview('product-1');

    expect(mocks.checkBaseSkuExistsMock).toHaveBeenCalledWith(
      'resolved-token',
      'inventory-1',
      'AXESTO001'
    );
    expect(preview?.canSync).toBe(true);
    expect(preview?.linkedBaseProductId).toBe('base-123');
    expect(preview?.status).toBe('ready');
  });

  it('runs a one-product Base sync and returns the refreshed preview', async () => {
    const updateProduct = vi.fn().mockResolvedValue({ id: 'product-1' });
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProductById: vi
        .fn()
        .mockResolvedValueOnce({
          id: 'product-1',
          name_en: 'App title',
          description_en: 'App description',
          stock: 5,
          price: 123,
          sku: 'AXESTO001',
          ean: 'EAN-1',
          weight: 100,
          baseProductId: null,
          importSource: 'base',
        })
        .mockResolvedValueOnce({
          id: 'product-1',
          name_en: 'App title',
          description_en: 'App description',
          stock: 8,
          price: 123,
          sku: 'AXESTO001',
          ean: 'EAN-1',
          weight: 100,
          baseProductId: 'base-123',
          importSource: 'base',
        }),
      updateProduct,
    });
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        externalListingId: 'base-123',
      },
      repository: buildListingRepository(),
    });

    const response = await runProductBaseSync('product-1');

    expect(updateProduct).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        stock: 8,
        baseProductId: 'base-123',
      })
    );
    expect(mocks.callBaseApiMock).toHaveBeenCalledWith(
      'resolved-token',
      'addInventoryProduct',
      expect.objectContaining({
        inventory_id: 'inventory-1',
        product_id: 'base-123',
        text_fields: {
          name: 'App title',
        },
      })
    );
    expect(response?.result.status).toBe('success');
    expect(response?.preview.linkedBaseProductId).toBe('base-123');
    expect(response?.preview.profile?.connectionName).toBe('Main Base Connection');
  });

  it('runs a one-product Base sync from Base import SKU and backfills the local link', async () => {
    const updateProduct = vi.fn().mockResolvedValue({ id: 'product-1' });
    const listingRepository = buildListingRepository();
    mocks.getProductListingRepositoryMock.mockResolvedValue(listingRepository);
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProductById: vi
        .fn()
        .mockResolvedValueOnce({
          id: 'product-1',
          name_en: 'App title',
          description_en: 'App description',
          stock: 5,
          price: 123,
          sku: 'AXESTO001',
          ean: 'EAN-1',
          weight: 100,
          baseProductId: null,
          importSource: 'base',
        })
        .mockResolvedValueOnce({
          id: 'product-1',
          name_en: 'App title',
          description_en: 'App description',
          stock: 8,
          price: 123,
          sku: 'AXESTO001',
          ean: 'EAN-1',
          weight: 100,
          baseProductId: 'base-123',
          importSource: 'base',
        }),
      updateProduct,
    });
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue(null);

    const response = await runProductBaseSync('product-1');

    expect(mocks.checkBaseSkuExistsMock).toHaveBeenCalledWith(
      'resolved-token',
      'inventory-1',
      'AXESTO001'
    );
    expect(updateProduct).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        stock: 8,
        baseProductId: 'base-123',
      })
    );
    expect(listingRepository.createListing).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        externalListingId: 'base-123',
        marketplaceData: expect.objectContaining({
          source: 'product-sync',
          marketplace: 'base',
        }),
      })
    );
    expect(response?.preview.linkedBaseProductId).toBe('base-123');
  });

  it('propagates cleared values in both sync directions instead of skipping them', async () => {
    const updateProduct = vi.fn().mockResolvedValue({ id: 'product-1' });
    mocks.getDefaultProductSyncProfileMock.mockResolvedValue({
      id: 'profile-1',
      name: 'Base Product Sync',
      isDefault: true,
      enabled: true,
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: null,
      scheduleIntervalMinutes: 30,
      batchSize: 100,
      conflictPolicy: 'skip',
      fieldRules: [
        {
          id: 'rule-description',
          appField: 'description_en',
          baseField: 'text_fields.description',
          direction: 'base_to_app',
        },
        {
          id: 'rule-ean',
          appField: 'ean',
          baseField: 'ean',
          direction: 'app_to_base',
        },
      ],
      lastRunAt: null,
      createdAt: '2026-04-11T10:00:00.000Z',
      updatedAt: '2026-04-11T10:00:00.000Z',
    });
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProductById: vi
        .fn()
        .mockResolvedValueOnce({
          id: 'product-1',
          name_en: 'App title',
          description_en: 'Legacy app description',
          stock: 5,
          price: 123,
          sku: 'AXESTO001',
          ean: null,
          weight: 100,
          baseProductId: null,
          importSource: 'base',
        })
        .mockResolvedValueOnce({
          id: 'product-1',
          name_en: 'App title',
          description_en: null,
          stock: 5,
          price: 123,
          sku: 'AXESTO001',
          ean: null,
          weight: 100,
          baseProductId: 'base-123',
          importSource: 'base',
        }),
      updateProduct,
    });
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        externalListingId: 'base-123',
      },
      repository: buildListingRepository(),
    });
    mocks.fetchBaseProductDetailsMock
      .mockResolvedValueOnce([
        {
          product_id: 'base-123',
          text_fields: {
            description: '',
          },
          ean: 'STALE-EAN',
        },
      ])
      .mockResolvedValueOnce([
        {
          product_id: 'base-123',
          text_fields: {
            description: '',
          },
          ean: '',
        },
      ]);

    const response = await runProductBaseSync('product-1');

    expect(updateProduct).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        description_en: null,
        baseProductId: 'base-123',
      })
    );
    expect(mocks.callBaseApiMock).toHaveBeenCalledWith(
      'resolved-token',
      'addInventoryProduct',
      expect.objectContaining({
        inventory_id: 'inventory-1',
        product_id: 'base-123',
        ean: null,
      })
    );
    expect(response?.result.localChanges).toContain('description_en');
    expect(response?.result.baseChanges).toContain('ean');
    expect(
      response?.preview.fields.find((field) => field.appField === 'description_en')
    ).toMatchObject({
      appValue: null,
      baseValue: null,
      hasDifference: false,
    });
    expect(response?.preview.fields.find((field) => field.appField === 'ean')).toMatchObject({
      appValue: null,
      baseValue: null,
      hasDifference: false,
    });
  });

  it('scheduled sync runs include Base-import products that resolve through SKU fallback', async () => {
    const updateProduct = vi.fn().mockResolvedValue({ id: 'product-1' });
    const listingRepository = buildListingRepository();
    mocks.getProductListingRepositoryMock.mockResolvedValue(listingRepository);
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProducts: vi
        .fn()
        .mockResolvedValueOnce([
          {
            id: 'product-1',
            name_en: 'App title',
            description_en: 'App description',
            stock: 5,
            price: 123,
            sku: 'AXESTO001',
            ean: 'EAN-1',
            weight: 100,
            baseProductId: null,
            importSource: 'base',
          },
        ])
        .mockResolvedValueOnce([]),
      updateProduct,
    });
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue(null);

    const run = await processProductSyncRun('run-1');

    expect(mocks.checkBaseSkuExistsMock).toHaveBeenCalledWith(
      'resolved-token',
      'inventory-1',
      'AXESTO001'
    );
    expect(updateProduct).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        stock: 8,
        baseProductId: 'base-123',
      })
    );
    expect(mocks.putProductSyncRunItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        productId: 'product-1',
        baseProductId: 'base-123',
        status: 'success',
      })
    );
    expect(run.status).toBe('completed');
    expect(run.stats).toMatchObject({
      total: 1,
      processed: 1,
      success: 1,
      failed: 0,
    });
  });
});
