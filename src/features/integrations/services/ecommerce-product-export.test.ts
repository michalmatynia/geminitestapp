import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

import type { ProductWithImages } from '@/shared/contracts/products/product';

const {
  categoryFindOneMock,
  catalogGetByIdMock,
  cloudEcommerceDbMock,
  ecommerceCollectionMock,
  ecommerceDeleteManyMock,
  ecommerceDbMock,
  getAllEcommerceExportDbTargetsForWriteMock,
  getAllEcommerceExportDbsForCleanupMock,
  getCloudEcommerceExportDbMock,
  localEcommerceDbMock,
  getProductsMongoDbMock,
  getCatalogRepositoryMock,
  getProductRepositoryMock,
  getShippingGroupRepositoryMock,
  listingDeleteManyMock,
  listingUpdateOneMock,
  listingCollectionMock,
  productCategoryUpdateOneMock,
  productCreateIndexMock,
  priceGroupFindMock,
  priceGroupToArrayMock,
  productUpdateOneMock,
  productsDbMock,
  shippingGroupGetByIdMock,
} = vi.hoisted(() => ({
  categoryFindOneMock: vi.fn(),
  catalogGetByIdMock: vi.fn(),
  cloudEcommerceDbMock: { namespace: 'ecom_cloud' },
  ecommerceDeleteManyMock: vi.fn(),
  ecommerceCollectionMock: vi.fn(),
  ecommerceDbMock: {},
  getAllEcommerceExportDbTargetsForWriteMock: vi.fn(),
  getAllEcommerceExportDbsForCleanupMock: vi.fn(),
  getCloudEcommerceExportDbMock: vi.fn(),
  localEcommerceDbMock: { namespace: 'ecom_local' },
  getProductsMongoDbMock: vi.fn(),
  getCatalogRepositoryMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
  getShippingGroupRepositoryMock: vi.fn(),
  listingDeleteManyMock: vi.fn(),
  listingUpdateOneMock: vi.fn(),
  listingCollectionMock: vi.fn(),
  productCategoryUpdateOneMock: vi.fn(),
  productCreateIndexMock: vi.fn(),
  priceGroupFindMock: vi.fn(),
  priceGroupToArrayMock: vi.fn(),
  productUpdateOneMock: vi.fn(),
  productsDbMock: {},
  shippingGroupGetByIdMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/product-mongo-client', () => ({
  getMongoDb: getProductsMongoDbMock,
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: getProductRepositoryMock,
}));

vi.mock('@/shared/lib/products/services/catalog-repository', () => ({
  getCatalogRepository: getCatalogRepositoryMock,
}));

vi.mock('@/shared/lib/products/services/shipping-group-repository', () => ({
  getShippingGroupRepository: getShippingGroupRepositoryMock,
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
          'Local ecommerce database is not reachable. Start the local ecommerce MongoDB service and try again.'
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

import {
  buildEcommerceCategoryDocument,
  buildEcommerceProductExportDocument,
} from './ecommerce-product-export.mapper';
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

  it('does not infer missing categories from the pipe-delimited product name', () => {
    const product = buildProduct({
      category: undefined,
      categoryId: 'cat-keychain',
      name_en: 'Container | 4 cm | Metal | Keychain Mini Dice | Dungeons and Dragons',
    } as Partial<ProductWithImages>);
    const document = buildEcommerceProductExportDocument(product, '2026-05-08T10:00:00.000Z');
    const categoryDocument = buildEcommerceCategoryDocument(product, '2026-05-08T10:00:00.000Z');

    expect(document.categoryName).toBeNull();
    expect(document.collectionSlug).toBe('objects');
    expect(categoryDocument).toBeNull();
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
    categoryFindOneMock.mockResolvedValue(null);
    priceGroupFindMock.mockReturnValue({ toArray: priceGroupToArrayMock });
    priceGroupToArrayMock.mockResolvedValue([]);
    catalogGetByIdMock.mockResolvedValue(null);
    getCatalogRepositoryMock.mockResolvedValue({
      getCatalogById: catalogGetByIdMock,
    });
    shippingGroupGetByIdMock.mockResolvedValue(null);
    getShippingGroupRepositoryMock.mockResolvedValue({
      getShippingGroupById: shippingGroupGetByIdMock,
    });
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
    listingCollectionMock.mockImplementation((collectionName: string) => {
      if (collectionName === 'product_categories') {
        return { findOne: categoryFindOneMock };
      }
      if (collectionName === 'price_groups') {
        return { find: priceGroupFindMock };
      }
      return { updateOne: listingUpdateOneMock };
    });
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
    expect(productCreateIndexMock).toHaveBeenCalledWith(
      { sourceProductId: 1 },
      {
        unique: true,
        name: 'source_product_id_unique',
        partialFilterExpression: { sourceProductId: { $type: 'string' } },
      }
    );
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
    const update = productUpdateOneMock.mock.calls[0]?.[1] as {
      $set?: Record<string, unknown>;
      $unset?: Record<string, unknown>;
    };
    expect(update.$set?.createdAt).toBeInstanceOf(Date);
    expect(update.$set?.exportedAt).toBeInstanceOf(Date);
    expect(update.$set?.updatedAt).toBeInstanceOf(Date);
    expect(update.$unset).toMatchObject({
      priceAddToPrice: '',
      priceBaseCurrencyCode: '',
      priceGroupBasePriceField: '',
      priceGroupType: '',
      priceMultiplier: '',
    });
    expect(update).not.toHaveProperty('$setOnInsert');
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

  it('exports base price and shipping metadata without embedding price group data', async () => {
    getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue(
        buildProduct({
          defaultPriceGroupId: 'group-pln',
          price: 100,
          sourcePrice: 80,
          sourcePriceCurrencyCode: 'PLN',
          shippingGroupId: 'shipping-group-1',
        } as Partial<ProductWithImages>)
      ),
    });
    shippingGroupGetByIdMock.mockResolvedValue({
      id: 'shipping-group-1',
      createdAt: '2026-05-01T10:00:00.000Z',
      updatedAt: '2026-05-01T10:00:00.000Z',
      name: 'Small parcel',
      description: 'Lightweight goods',
      catalogId: 'catalog-source',
      traderaShippingCondition: 'seller_pays_shipping',
      traderaShippingPriceEur: 7,
      autoAssignCategoryIds: ['cat-1'],
      autoAssignCurrencyCodes: ['PLN'],
    });

    await exportProductToEcommerce(' product-12345678 ');

    expect(shippingGroupGetByIdMock).toHaveBeenCalledWith('shipping-group-1');
    const update = productUpdateOneMock.mock.calls[0]?.[1] as {
      $set?: Record<string, unknown>;
    };
    expect(update.$set).toEqual(
      expect.objectContaining({
        defaultPriceGroupId: 'group-pln',
        price: 100,
        priceCurrencyCode: null,
        sourcePrice: 80,
        sourcePriceCurrencyCode: 'PLN',
        shippingGroupId: 'shipping-group-1',
        shippingGroupName: 'Small parcel',
        shippingGroupSource: 'manual',
        shippingGroupTraderaShippingPriceEur: 7,
      })
    );
    expect(update.$set).not.toHaveProperty('priceAddToPrice');
    expect(update.$set).not.toHaveProperty('priceGroupType');
    expect(update.$set).not.toHaveProperty('priceMultiplier');
    expect(priceGroupFindMock).not.toHaveBeenCalled();
  });

  it('exports product price as source base price when source price is missing', async () => {
    getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue(
        buildProduct({
          defaultPriceGroupId: 'group-source-pln',
          price: 125,
          sourcePrice: null,
          sourcePriceCurrencyCode: null,
        } as Partial<ProductWithImages>)
      ),
    });

    await exportProductToEcommerce(' product-12345678 ');

    const update = productUpdateOneMock.mock.calls[0]?.[1] as {
      $set?: Record<string, unknown>;
    };
    expect(update.$set).toEqual(
      expect.objectContaining({
        defaultPriceGroupId: 'group-source-pln',
        price: 125,
        priceCurrencyCode: null,
        sourcePrice: 125,
        sourcePriceCurrencyCode: null,
      })
    );
    expect(priceGroupFindMock).not.toHaveBeenCalled();
  });

  it('exports the catalog default price group when the product has no explicit default group', async () => {
    getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue(
        buildProduct({
          defaultPriceGroupId: null,
          catalogId: 'catalog-source',
          price: 100,
        } as Partial<ProductWithImages>)
      ),
    });
    catalogGetByIdMock.mockResolvedValue({
      id: 'catalog-source',
      defaultPriceGroupId: 'group-catalog-pln',
    });

    await exportProductToEcommerce(' product-12345678 ');

    expect(catalogGetByIdMock).toHaveBeenCalledWith('catalog-source');
    const update = productUpdateOneMock.mock.calls[0]?.[1] as {
      $set?: Record<string, unknown>;
    };
    expect(update.$set).toEqual(
      expect.objectContaining({
        defaultPriceGroupId: 'group-catalog-pln',
        price: 100,
      })
    );
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

  it('hydrates a product category by ObjectId before exporting', async () => {
    const categoryId = '69da99fb855cd0bfc9a2ab83';
    getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue(
        buildProduct({
          id: 'product-keycha1453',
          sku: 'KEYCHA1453',
          category: undefined,
          categoryId,
          name_en: 'Container | 4 cm | Metal | Keychain Mini Dice | Dungeons and Dragons',
        } as Partial<ProductWithImages>)
      ),
    });
    categoryFindOneMock.mockResolvedValue({
      _id: new ObjectId(categoryId),
      name: 'Keychain Mini Dice',
      name_en: 'Keychain Mini Dice',
      name_pl: 'Brelok z Mini Kosci',
      catalogId: 'catalog-source',
      parentId: new ObjectId('69992f0b64c3eedcbebf22fb'),
      sortIndex: 4,
    });

    const result = await exportProductToEcommerce(' product-keycha1453 ');

    expect(categoryFindOneMock).toHaveBeenCalledWith({
      $or: [
        { _id: { $in: [categoryId, expect.any(ObjectId)] } },
        { id: categoryId },
      ],
    });
    expect(productUpdateOneMock).toHaveBeenCalledWith(
      { _id: 'product-keycha1453' },
      expect.objectContaining({
        $set: expect.objectContaining({
          categoryId,
          categoryName: 'Keychain Mini Dice',
          categoryName_pl: 'Brelok z Mini Kosci',
          collectionSlug: 'accessories',
          sku: 'KEYCHA1453',
        }),
      }),
      { upsert: true }
    );
    expect(productCategoryUpdateOneMock).toHaveBeenCalledWith(
      { _id: categoryId },
      expect.objectContaining({
        $set: expect.objectContaining({
          collectionSlug: 'accessories',
          name: 'Keychain Mini Dice',
          sourceCategoryId: categoryId,
        }),
      }),
      { upsert: true }
    );
    expect(result).toMatchObject({
      productId: 'product-keycha1453',
      status: 'created',
      slug: 'keycha1453',
    });
  });

  it('warns and skips ecommerce writes when the product category is missing', async () => {
    getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue(
        buildProduct({
          category: undefined,
          categoryId: 'missing-category',
        } as Partial<ProductWithImages>)
      ),
    });

    await expect(exportProductToEcommerce(' product-12345678 ')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      expected: true,
      httpStatus: 400,
      message: 'Category is missing. Assign a product category before exporting to ecommerce.',
      meta: {
        categoryId: 'missing-category',
        productId: 'product-12345678',
        reason: 'missing_ecommerce_category',
        sku: 'SKU-123',
      },
    });

    expect(categoryFindOneMock).toHaveBeenCalledWith({
      $or: [{ _id: { $in: ['missing-category'] } }, { id: 'missing-category' }],
    });
    expect(catalogGetByIdMock).not.toHaveBeenCalled();
    expect(getAllEcommerceExportDbTargetsForWriteMock).not.toHaveBeenCalled();
    expect(productUpdateOneMock).not.toHaveBeenCalled();
    expect(productCategoryUpdateOneMock).not.toHaveBeenCalled();
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
        'Local ecommerce database is not reachable. Start the local ecommerce MongoDB service and try again.',
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
