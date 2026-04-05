import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

const mocks = vi.hoisted(() => ({
  buildBaseProductDataMock: vi.fn(),
  exportProductImagesToBaseMock: vi.fn(),
  exportProductToBaseMock: vi.fn(),
  getExportStockFallbackEnabledMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  buildBaseProductData: (...args: unknown[]) => mocks.buildBaseProductDataMock(...args),
  exportProductImagesToBase: (...args: unknown[]) => mocks.exportProductImagesToBaseMock(...args),
  exportProductToBase: (...args: unknown[]) => mocks.exportProductToBaseMock(...args),
  getExportStockFallbackEnabled: (...args: unknown[]) =>
    mocks.getExportStockFallbackEnabledMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logWarning: (...args: unknown[]) => mocks.logWarningMock(...args),
  },
}));

import { executeBaseExport } from './export-executor';

const createProduct = (): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-001',
    stock: 5,
    images: [],
    imageLinks: [],
    imageBase64s: [],
    tags: [],
    catalogs: [],
    parameters: [],
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    categoryId: null,
    price: 10,
    weight: null,
    ean: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  }) as ProductWithImages;

describe('executeBaseExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.buildBaseProductDataMock.mockResolvedValue({
      sku: 'SKU-001',
      text_fields: { name: 'Product 1' },
    });
    mocks.getExportStockFallbackEnabledMock.mockResolvedValue(false);
  });

  it('retries as a create when Base rejects a stale existing product id', async () => {
    mocks.exportProductToBaseMock
      .mockResolvedValueOnce({
        success: false,
        error: 'No product with ID 531482664',
      })
      .mockResolvedValueOnce({
        success: true,
        productId: 'base-new-1',
      });

    const result = await executeBaseExport({
      imagesOnly: false,
      token: 'token-1',
      targetInventoryId: 'inv-main',
      exportProduct: createProduct(),
      effectiveMappings: [],
      warehouseId: null,
      listingExternalId: '531482664',
      imageBaseUrl: 'http://localhost',
      stockWarehouseAliases: undefined,
      producerNameById: undefined,
      producerExternalIdByInternalId: undefined,
      tagNameById: undefined,
      tagExternalIdByInternalId: undefined,
      exportImagesAsBase64: false,
      imageBase64Mode: 'base-only',
      imageTransform: null,
      baseImageDiagnostics: undefined,
      product: { id: 'product-1', stock: 5 },
      canRetryWrite: false,
    });

    expect(mocks.exportProductToBaseMock).toHaveBeenCalledTimes(2);
    expect(mocks.exportProductToBaseMock.mock.calls[0]?.[5]).toEqual(
      expect.objectContaining({
        existingProductId: '531482664',
      })
    );
    expect(mocks.exportProductToBaseMock.mock.calls[1]?.[5]).not.toHaveProperty(
      'existingProductId'
    );
    expect(mocks.logWarningMock).toHaveBeenCalledWith(
      '[export-to-base] Existing Base.com product id is stale, retrying export as create',
      expect.objectContaining({
        staleExternalListingId: '531482664',
      })
    );
    expect(result.result).toEqual({
      success: true,
      productId: 'base-new-1',
    });
  });

  it('caches base64 images from the first build and reuses them on warehouse mismatch retry', async () => {
    const imageData = { '0': 'data:image/jpeg;base64,img0', '1': 'data:image/jpeg;base64,img1' };

    mocks.buildBaseProductDataMock
      .mockResolvedValueOnce({
        sku: 'SKU-001',
        images: imageData,
        stock: { 'wh-1': 5 },
      })
      .mockResolvedValueOnce({
        sku: 'SKU-001',
        images: imageData,
      });

    mocks.getExportStockFallbackEnabledMock.mockResolvedValue(true);

    mocks.exportProductToBaseMock
      .mockResolvedValueOnce({
        success: false,
        error: 'Warehouse wh-1 is not included in inventory',
      })
      .mockResolvedValueOnce({
        success: true,
        productId: 'base-1',
      });

    const result = await executeBaseExport({
      imagesOnly: false,
      token: 'token-1',
      targetInventoryId: 'inv-main',
      exportProduct: createProduct(),
      effectiveMappings: [],
      warehouseId: 'wh-1',
      listingExternalId: null,
      imageBaseUrl: 'http://localhost',
      stockWarehouseAliases: undefined,
      producerNameById: undefined,
      producerExternalIdByInternalId: undefined,
      tagNameById: undefined,
      tagExternalIdByInternalId: undefined,
      exportImagesAsBase64: true,
      imageBase64Mode: 'base-only',
      imageTransform: null,
      baseImageDiagnostics: undefined,
      product: { id: 'product-1', stock: 5 },
      canRetryWrite: false,
    });

    expect(result.result.success).toBe(true);
    expect(mocks.buildBaseProductDataMock).toHaveBeenCalledTimes(2);

    // The second build call should include cachedImages from the first build
    const secondBuildOptions = mocks.buildBaseProductDataMock.mock.calls[1]?.[3];
    expect(secondBuildOptions).toEqual(
      expect.objectContaining({
        cachedImages: imageData,
      })
    );
  });

  it('does not cache images when exportImagesAsBase64 is false', async () => {
    mocks.buildBaseProductDataMock.mockResolvedValue({
      sku: 'SKU-001',
      images: ['http://localhost/img0.jpg'],
    });

    mocks.getExportStockFallbackEnabledMock.mockResolvedValue(true);

    mocks.exportProductToBaseMock
      .mockResolvedValueOnce({
        success: false,
        error: 'Warehouse wh-1 is not included in inventory',
      })
      .mockResolvedValueOnce({
        success: true,
        productId: 'base-1',
      });

    await executeBaseExport({
      imagesOnly: false,
      token: 'token-1',
      targetInventoryId: 'inv-main',
      exportProduct: createProduct(),
      effectiveMappings: [],
      warehouseId: 'wh-1',
      listingExternalId: null,
      imageBaseUrl: 'http://localhost',
      stockWarehouseAliases: undefined,
      producerNameById: undefined,
      producerExternalIdByInternalId: undefined,
      tagNameById: undefined,
      tagExternalIdByInternalId: undefined,
      exportImagesAsBase64: false,
      imageBase64Mode: 'base-only',
      imageTransform: null,
      baseImageDiagnostics: undefined,
      product: { id: 'product-1', stock: 5 },
      canRetryWrite: false,
    });

    // Second build should NOT have cachedImages since we're using URL mode
    const secondBuildOptions = mocks.buildBaseProductDataMock.mock.calls[1]?.[3];
    expect(secondBuildOptions).not.toHaveProperty('cachedImages');
  });

  it('caches base64 images on stock mismatch retry path', async () => {
    const imageData = { '0': 'data:image/jpeg;base64,stockRetryImg' };

    mocks.buildBaseProductDataMock
      .mockResolvedValueOnce({
        sku: 'SKU-001',
        images: imageData,
        stock: 5,
      })
      .mockResolvedValueOnce({
        sku: 'SKU-001',
        images: imageData,
      });

    mocks.getExportStockFallbackEnabledMock.mockResolvedValue(false);

    mocks.exportProductToBaseMock
      .mockResolvedValueOnce({
        success: false,
        error: 'Invalid stock quantity',
      })
      .mockResolvedValueOnce({
        success: true,
        productId: 'base-stock-retry',
      });

    const result = await executeBaseExport({
      imagesOnly: false,
      token: 'token-1',
      targetInventoryId: 'inv-main',
      exportProduct: createProduct(),
      effectiveMappings: [],
      warehouseId: null,
      listingExternalId: 'existing-1',
      imageBaseUrl: 'http://localhost',
      stockWarehouseAliases: undefined,
      producerNameById: undefined,
      producerExternalIdByInternalId: undefined,
      tagNameById: undefined,
      tagExternalIdByInternalId: undefined,
      exportImagesAsBase64: true,
      imageBase64Mode: 'base-only',
      imageTransform: null,
      baseImageDiagnostics: undefined,
      product: { id: 'product-1', stock: 5 },
      canRetryWrite: true,
    });

    expect(result.result.success).toBe(true);
    expect(mocks.buildBaseProductDataMock).toHaveBeenCalledTimes(2);

    const secondBuildOptions = mocks.buildBaseProductDataMock.mock.calls[1]?.[3];
    expect(secondBuildOptions).toEqual(
      expect.objectContaining({
        cachedImages: imageData,
      })
    );
  });
});
