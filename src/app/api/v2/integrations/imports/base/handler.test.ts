import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  fetchBaseInventoriesMock: vi.fn(),
  fetchBaseWarehousesMock: vi.fn(),
  fetchBaseWarehousesDebugMock: vi.fn(),
  fetchBaseAllWarehousesMock: vi.fn(),
  fetchBaseAllWarehousesDebugMock: vi.fn(),
  fetchBaseProductIdsMock: vi.fn(),
  fetchBaseProductDetailsMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  mapBaseProductMock: vi.fn(),
  extractBaseImageUrlsMock: vi.fn(),
  resolvePriceGroupContextMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  getCatalogRepositoryMock: vi.fn(),
  getProductDataProviderMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
}));

vi.mock('@/features/integrations/services/imports/base-client', () => ({
  fetchBaseInventories: (...args: unknown[]) => mocks.fetchBaseInventoriesMock(...args),
  fetchBaseWarehouses: (...args: unknown[]) => mocks.fetchBaseWarehousesMock(...args),
  fetchBaseWarehousesDebug: (...args: unknown[]) => mocks.fetchBaseWarehousesDebugMock(...args),
  fetchBaseAllWarehouses: (...args: unknown[]) => mocks.fetchBaseAllWarehousesMock(...args),
  fetchBaseAllWarehousesDebug: (...args: unknown[]) =>
    mocks.fetchBaseAllWarehousesDebugMock(...args),
  fetchBaseProductIds: (...args: unknown[]) => mocks.fetchBaseProductIdsMock(...args),
  fetchBaseProductDetails: (...args: unknown[]) => mocks.fetchBaseProductDetailsMock(...args),
}));

vi.mock('@/features/integrations/services/integration-repository', () => ({
  getIntegrationRepository: (...args: unknown[]) => mocks.getIntegrationRepositoryMock(...args),
}));

vi.mock('@/features/integrations/services/imports/base-mapper', () => ({
  mapBaseProduct: (...args: unknown[]) => mocks.mapBaseProductMock(...args),
}));

vi.mock('@/features/integrations/services/imports/base-mapper-utils', () => ({
  extractBaseImageUrls: (...args: unknown[]) => mocks.extractBaseImageUrlsMock(...args),
}));

vi.mock('@/features/integrations/services/base-token-resolver', () => ({
  resolveBaseConnectionToken: (...args: unknown[]) =>
    mocks.resolveBaseConnectionTokenMock(...args),
}));

vi.mock('@/features/integrations/services/imports/base-import-service-context', () => ({
  resolvePriceGroupContext: (...args: unknown[]) => mocks.resolvePriceGroupContextMock(...args),
}));

vi.mock('@/features/products/server', () => ({
  getCatalogRepository: (...args: unknown[]) => mocks.getCatalogRepositoryMock(...args),
  getProductDataProvider: (...args: unknown[]) => mocks.getProductDataProviderMock(...args),
  getProductRepository: (...args: unknown[]) => mocks.getProductRepositoryMock(...args),
}));

import { postBaseImportsHandler } from './handler';

const createRequestContext = (body: unknown): ApiHandlerContext => ({ body }) as ApiHandlerContext;

describe('postBaseImportsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getIntegrationRepositoryMock.mockResolvedValue({
      listIntegrations: vi.fn().mockResolvedValue([
        {
          id: 'integration-base-1',
          slug: 'base-com',
        },
      ]),
      getConnectionByIdAndIntegration: vi.fn().mockResolvedValue({
        id: 'connection-1',
        baseApiToken: 'token-1',
      }),
    });
    mocks.resolveBaseConnectionTokenMock.mockReturnValue({ token: 'token-1' });
    mocks.getCatalogRepositoryMock.mockResolvedValue({
      listCatalogs: vi.fn().mockResolvedValue([
        {
          id: 'catalog-1',
          isDefault: true,
          defaultPriceGroupId: null,
        },
      ]),
    });
    mocks.getProductDataProviderMock.mockResolvedValue({});
    mocks.resolvePriceGroupContextMock.mockResolvedValue({
      preferredCurrencies: [],
    });
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProducts: vi.fn().mockResolvedValue([]),
    });
    mocks.fetchBaseProductIdsMock.mockResolvedValue(
      Array.from({ length: 10 }, (_unused, index) => String(index + 1))
    );
    mocks.fetchBaseProductDetailsMock.mockImplementation(
      async (_token: string, _inventoryId: string, ids: string[]) =>
        ids.map((id) => ({
          id,
          product_id: id,
          name: `Product ${id}`,
          sku: `SKU-${id}`,
        }))
    );
    mocks.mapBaseProductMock.mockImplementation((record: { id: string; name: string; sku: string }) => ({
      baseProductId: record.id,
      name_en: record.name,
      sku: record.sku,
      price: 10,
      stock: 5,
    }));
    mocks.extractBaseImageUrlsMock.mockReturnValue([]);
  });

  it('caps the import list by limit even when pageSize is larger', async () => {
    const response = await postBaseImportsHandler(
      new NextRequest('http://localhost/api/v2/integrations/imports/base', {
        method: 'POST',
      }),
      createRequestContext({
        action: 'list',
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        catalogId: 'catalog-1',
        limit: 5,
        page: 1,
        pageSize: 25,
      })
    );

    const payload = await response.json();

    expect(payload.products).toHaveLength(5);
    expect(payload.products.map((item: { baseProductId: string }) => item.baseProductId)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
    ]);
    expect(payload.pageSize).toBe(5);
    expect(payload.totalPages).toBe(1);
    expect(payload.available).toBe(5);
    expect(payload.filtered).toBe(5);
    expect(payload.total).toBe(10);
    expect(mocks.fetchBaseProductDetailsMock).toHaveBeenCalledTimes(1);
    expect(mocks.fetchBaseProductDetailsMock).toHaveBeenCalledWith(
      'token-1',
      'inventory-1',
      ['1', '2', '3', '4', '5']
    );
  });

  it('returns all matching ids for the current filtered scope', async () => {
    const response = await postBaseImportsHandler(
      new NextRequest('http://localhost/api/v2/integrations/imports/base', {
        method: 'POST',
      }),
      createRequestContext({
        action: 'list_ids',
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        catalogId: 'catalog-1',
        limit: 5,
      })
    );

    const payload = await response.json();

    expect(payload).toEqual({
      ids: ['1', '2', '3', '4', '5'],
      totalMatching: 5,
    });
    expect(mocks.fetchBaseProductDetailsMock).not.toHaveBeenCalled();
  });
});
