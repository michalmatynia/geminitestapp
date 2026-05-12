import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

const {
  cloudEcommerceDbMock,
  ecommerceCollectionMock,
  ecommerceDeleteManyMock,
  ecommerceDbMock,
  getAllEcommerceExportDbTargetsForWriteMock,
  getAllEcommerceExportDbsForCleanupMock,
  getCloudEcommerceExportDbMock,
  localEcommerceDbMock,
  getProductsMongoDbMock,
  getProductRepositoryMock,
  listingDeleteManyMock,
  listingUpdateOneMock,
  listingCollectionMock,
  productCategoryUpdateOneMock,
  productCreateIndexMock,
  productUpdateOneMock,
  productsDbMock,
} = vi.hoisted(() => ({
  cloudEcommerceDbMock: { namespace: 'ecom_cloud' },
  ecommerceDeleteManyMock: vi.fn(),
  ecommerceCollectionMock: vi.fn(),
  ecommerceDbMock: {},
  getAllEcommerceExportDbTargetsForWriteMock: vi.fn(),
  getAllEcommerceExportDbsForCleanupMock: vi.fn(),
  getCloudEcommerceExportDbMock: vi.fn(),
  localEcommerceDbMock: { namespace: 'ecom_local' },
  getProductsMongoDbMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
  listingDeleteManyMock: vi.fn(),
  listingUpdateOneMock: vi.fn(),
  listingCollectionMock: vi.fn(),
  productCategoryUpdateOneMock: vi.fn(),
  productCreateIndexMock: vi.fn(),
  productUpdateOneMock: vi.fn(),
  productsDbMock: {},
}));

vi.mock('@/shared/lib/db/product-mongo-client', () => ({
  getMongoDb: getProductsMongoDbMock,
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: getProductRepositoryMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn(),
}));

vi.mock('./ecommerce-product-export.config', () => ({
  ECOM_CATEGORIES_COLLECTION: 'product_categories',
  ECOM_PRODUCTS_COLLECTION: 'products',
  getCloudEcommerceExportDb: getCloudEcommerceExportDbMock,
  getAllEcommerceExportDbTargetsForWrite: getAllEcommerceExportDbTargetsForWriteMock,
  getAllEcommerceExportDbsForCleanup: getAllEcommerceExportDbsForCleanupMock,
  toEcommerceExportDbError: (
    target: { dbName: string; source: string },
    error: unknown
  ): unknown => {
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return Object.assign(
        new Error(
          'Local ecommerce database is not reachable. Start the local ecommerce MongoDB service and try the export again.'
        ),
        {
          code: 'DATABASE_ERROR',
          expected: true,
          httpStatus: 503,
          meta: {
            ecommerceMongoDbName: target.dbName,
            ecommerceMongoSource: target.source,
          },
          retryable: true,
        }
      );
    }
    return error;
  },
}));

import { buildEcommerceProductExportDocument } from './ecommerce-product-export.mapper';
import { deleteProductFromEcommerceExport, exportProductToEcommerce } from './ecommerce-product-export';

const buildProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-12345678',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-02T10:00:00.000Z',
    sku: 'SKU-123',
    baseProductId: null,
    importSource: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: { en: 'English title', pl: 'Polish title', de: null },
    description: { en: 'English description', pl: 'Polish description', de: null },
    name_en: 'English title',
    name_pl: 'Polish title',
    name_de: null,
    description_en: 'English description',
    description_pl: 'Polish description',
    description_de: null,
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 4,
    sourcePrice: null,
    sourcePriceCurrencyCode: null,
    price: 19.99,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: true,
    archived: false,
    categoryId: 'cat-1',
    shippingGroupId: null,
    catalogId: 'catalog-source',
    category: {
      id: 'cat-1',
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z',
      name: 'Accessories',
      name_en: 'Accessories',
      name_pl: 'Akcesoria',
      name_de: null,
      color: null,
      parentId: null,
      catalogId: 'catalog-source',
      sortIndex: null,
    },
    images: [
      {
        productId: 'product-12345678',
        imageFileId: 'file-1',
        assignedAt: '2026-05-01T10:00:00.000Z',
        imageFile: {
          id: 'file-1',
          filename: 'image.png',
          filepath: '/uploads/products/SKU-123/image.png',
          mimetype: 'image/png',
          size: 100,
        },
      },
    ],
    catalogs: [],
    tags: [],
    producers: [],
    customFields: [],
    parameters: [],
    marketplaceContentOverrides: [],
    notes: null,
    imageLinks: ['https://cdn.example.test/product.png'],
    imageBase64s: [],
    noteIds: [],
    ...overrides,
  }) as ProductWithImages;

describe('buildEcommerceProductExportDocument', () => {
  it('maps Product List product data into the ecommerce storefront document shape', () => {
    const document = buildEcommerceProductExportDocument(
      buildProduct(),
      '2026-05-08T10:00:00.000Z'
    );

    expect(document).toMatchObject({
      _id: 'product-12345678',
      sourceProductId: 'product-12345678',
      source: 'geminitestapp-products',
      sku: 'SKU-123',
      slug: 'sku-123',
      name_en: 'English title',
      description_pl: 'Polish description',
      price: 19.99,
      stock: 4,
      published: true,
      archived: false,
      categoryId: 'cat-1',
      categoryName: 'Accessories',
      categoryName_pl: 'Akcesoria',
      collectionSlug: 'accessories',
      imageUrl: 'https://cdn.example.test/product.png',
      exportedAt: '2026-05-08T10:00:00.000Z',
    });
    expect(document.imageUrls).toEqual([
      'https://cdn.example.test/product.png',
      '/uploads/products/SKU-123/image.png',
    ]);
    expect(document.sourceChecksum).toHaveLength(64);
  });

  it('falls back to a name based slug when sku is missing', () => {
    const document = buildEcommerceProductExportDocument(
      buildProduct({ sku: null, name_en: 'Fallback Product' }),
      '2026-05-08T10:00:00.000Z'
    );

    expect(document.slug).toBe('fallback-product-product1');
  });
});

describe('deleteProductFromEcommerceExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ecommerceCollectionMock.mockReturnValue({ deleteMany: ecommerceDeleteManyMock });
    listingCollectionMock.mockReturnValue({ deleteMany: listingDeleteManyMock });
    (ecommerceDbMock as { collection?: typeof ecommerceCollectionMock }).collection =
      ecommerceCollectionMock;
    (productsDbMock as { collection?: typeof listingCollectionMock }).collection =
      listingCollectionMock;
    getAllEcommerceExportDbsForCleanupMock.mockResolvedValue([ecommerceDbMock]);
    getProductsMongoDbMock.mockResolvedValue(productsDbMock);
    ecommerceDeleteManyMock.mockResolvedValue({ deletedCount: 1 });
    listingDeleteManyMock.mockResolvedValue({ deletedCount: 1 });
  });

  it('removes exported ecommerce products and their listing badge', async () => {
    const result = await deleteProductFromEcommerceExport(' product-12345678 ');

    expect(ecommerceCollectionMock).toHaveBeenCalledWith('products');
    expect(ecommerceDeleteManyMock).toHaveBeenCalledWith({
      $or: [{ _id: 'product-12345678' }, { sourceProductId: 'product-12345678' }],
    });
    expect(listingCollectionMock).toHaveBeenCalledWith('product_listings');
    expect(listingDeleteManyMock).toHaveBeenCalledWith({
      productId: 'product-12345678',
      integrationId: 'ecommerce-export',
    });
    expect(result).toEqual({
      success: true,
      productId: 'product-12345678',
      ecommerceDeletedCount: 1,
      listingDeletedCount: 1,
    });
  });

  it('counts ecommerce product deletes across every export database target', async () => {
    const localDeleteManyMock = vi.fn().mockResolvedValue({ deletedCount: 1 });
    const cloudDeleteManyMock = vi.fn().mockResolvedValue({ deletedCount: 2 });
    getAllEcommerceExportDbsForCleanupMock.mockResolvedValue([
      {
        collection: vi.fn().mockReturnValue({ deleteMany: localDeleteManyMock }),
      },
      {
        collection: vi.fn().mockReturnValue({ deleteMany: cloudDeleteManyMock }),
      },
    ]);

    const result = await deleteProductFromEcommerceExport(' product-12345678 ');

    expect(localDeleteManyMock).toHaveBeenCalledWith({
      $or: [{ _id: 'product-12345678' }, { sourceProductId: 'product-12345678' }],
    });
    expect(cloudDeleteManyMock).toHaveBeenCalledWith({
      $or: [{ _id: 'product-12345678' }, { sourceProductId: 'product-12345678' }],
    });
    expect(result.ecommerceDeletedCount).toBe(3);
    expect(result.listingDeletedCount).toBe(1);
  });

  it('does not clear the local ecommerce badge when the cloud delete fails', async () => {
    const error = new Error('cloud delete failed');
    ecommerceDeleteManyMock.mockRejectedValue(error);

    await expect(deleteProductFromEcommerceExport(' product-12345678 ')).rejects.toThrow(
      'cloud delete failed'
    );

    expect(ecommerceDeleteManyMock).toHaveBeenCalledWith({
      $or: [{ _id: 'product-12345678' }, { sourceProductId: 'product-12345678' }],
    });
    expect(getProductsMongoDbMock).not.toHaveBeenCalled();
    expect(listingDeleteManyMock).not.toHaveBeenCalled();
  });
});

describe('exportProductToEcommerce', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue(buildProduct()),
    });
    getCloudEcommerceExportDbMock.mockResolvedValue(ecommerceDbMock);
    getAllEcommerceExportDbTargetsForWriteMock.mockResolvedValue([
      { dbName: 'ecom_local', key: 'local:ecom_local', db: localEcommerceDbMock, source: 'local' },
      { dbName: 'ecom_cloud', key: 'cloud:ecom_cloud', db: cloudEcommerceDbMock, source: 'cloud' },
    ]);
    getProductsMongoDbMock.mockResolvedValue(productsDbMock);
    productCreateIndexMock.mockResolvedValue('index');
    productUpdateOneMock.mockResolvedValue({ upsertedCount: 1 });
    productCategoryUpdateOneMock.mockResolvedValue({ upsertedCount: 1 });
    listingUpdateOneMock.mockResolvedValue({ upsertedCount: 1 });
    ecommerceCollectionMock.mockImplementation((collectionName: string) => {
      if (collectionName === 'products') {
        return {
          createIndex: productCreateIndexMock,
          updateOne: productUpdateOneMock,
        };
      }
      return {
        createIndex: productCreateIndexMock,
        updateOne: productCategoryUpdateOneMock,
      };
    });
    listingCollectionMock.mockReturnValue({ updateOne: listingUpdateOneMock });
    (localEcommerceDbMock as { collection?: typeof ecommerceCollectionMock }).collection =
      ecommerceCollectionMock;
    (cloudEcommerceDbMock as { collection?: typeof ecommerceCollectionMock }).collection =
      ecommerceCollectionMock;
    (productsDbMock as { collection?: typeof listingCollectionMock }).collection =
      listingCollectionMock;
  });

  it('writes exports to local and cloud ecommerce databases and records a local listing badge', async () => {
    const result = await exportProductToEcommerce(' product-12345678 ');

    expect(getAllEcommerceExportDbTargetsForWriteMock).toHaveBeenCalledTimes(1);
    expect(productUpdateOneMock).toHaveBeenCalledTimes(2);
    expect(productUpdateOneMock).toHaveBeenCalledWith(
      { _id: 'product-12345678' },
      expect.objectContaining({
        $set: expect.objectContaining({
          sku: 'SKU-123',
          published: true,
        }),
      }),
      { upsert: true }
    );
    expect(productCategoryUpdateOneMock).toHaveBeenCalledTimes(2);
    expect(listingUpdateOneMock).toHaveBeenCalledWith(
      { _id: 'ecom:product-12345678' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'active',
          integrationId: 'ecommerce-export',
          connectionId: 'ecommerce-export',
        }),
      }),
      { upsert: true }
    );
    expect(result.status).toBe('created');
  });

  it('does not record the local listing badge when any ecommerce database write fails', async () => {
    productUpdateOneMock
      .mockResolvedValueOnce({ upsertedCount: 1 })
      .mockRejectedValueOnce(new Error('cloud write failed'));

    await expect(exportProductToEcommerce(' product-12345678 ')).rejects.toThrow(
      'cloud write failed'
    );

    expect(productUpdateOneMock).toHaveBeenCalledTimes(2);
    expect(listingUpdateOneMock).not.toHaveBeenCalled();
  });

  it('reports a local ecommerce database outage when the local write loses its connection', async () => {
    const error = new Error('connect ECONNREFUSED 127.0.0.1:27021');
    productUpdateOneMock.mockRejectedValueOnce(error);

    await expect(exportProductToEcommerce(' product-12345678 ')).rejects.toMatchObject({
      code: 'DATABASE_ERROR',
      expected: true,
      httpStatus: 503,
      message:
        'Local ecommerce database is not reachable. Start the local ecommerce MongoDB service and try the export again.',
      meta: {
        ecommerceMongoDbName: 'ecom_local',
        ecommerceMongoSource: 'local',
      },
      retryable: true,
    });

    expect(listingUpdateOneMock).not.toHaveBeenCalled();
  });

  it('reports created when at least one ecommerce database target inserted a new product', async () => {
    productUpdateOneMock
      .mockResolvedValueOnce({ upsertedCount: 0 })
      .mockResolvedValueOnce({ upsertedCount: 1 });

    const result = await exportProductToEcommerce(' product-12345678 ');

    expect(result.status).toBe('created');
  });
});
