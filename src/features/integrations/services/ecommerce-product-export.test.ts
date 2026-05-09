import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

const {
  ecommerceCollectionMock,
  ecommerceDeleteManyMock,
  ecommerceDbMock,
  getAllEcommerceExportDbsForCleanupMock,
  getEcommerceExportDbMock,
  getProductsMongoDbMock,
  listingCollectionMock,
  listingUpdateManyMock,
  productsDbMock,
} = vi.hoisted(() => ({
  ecommerceDeleteManyMock: vi.fn(),
  ecommerceCollectionMock: vi.fn(),
  ecommerceDbMock: {},
  getAllEcommerceExportDbsForCleanupMock: vi.fn(),
  getEcommerceExportDbMock: vi.fn(),
  getProductsMongoDbMock: vi.fn(),
  listingCollectionMock: vi.fn(),
  listingUpdateManyMock: vi.fn(),
  productsDbMock: {},
}));

vi.mock('@/shared/lib/db/product-mongo-client', () => ({
  getMongoDb: getProductsMongoDbMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn(),
}));

vi.mock('./ecommerce-product-export.config', () => ({
  ECOM_CATEGORIES_COLLECTION: 'product_categories',
  ECOM_PRODUCTS_COLLECTION: 'products',
  getEcommerceExportDb: getEcommerceExportDbMock,
  getAllEcommerceExportDbsForCleanup: getAllEcommerceExportDbsForCleanupMock,
}));

import { buildEcommerceProductExportDocument } from './ecommerce-product-export.mapper';
import { deleteProductFromEcommerceExport } from './ecommerce-product-export';

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
    listingCollectionMock.mockReturnValue({ updateMany: listingUpdateManyMock });
    (ecommerceDbMock as { collection?: typeof ecommerceCollectionMock }).collection =
      ecommerceCollectionMock;
    (productsDbMock as { collection?: typeof listingCollectionMock }).collection =
      listingCollectionMock;
    getAllEcommerceExportDbsForCleanupMock.mockResolvedValue([ecommerceDbMock]);
    getProductsMongoDbMock.mockResolvedValue(productsDbMock);
    ecommerceDeleteManyMock.mockResolvedValue({ deletedCount: 1 });
    listingUpdateManyMock.mockResolvedValue({ modifiedCount: 1 });
  });

  it('removes exported ecommerce products and their listing badge', async () => {
    const result = await deleteProductFromEcommerceExport(' product-12345678 ');

    expect(ecommerceCollectionMock).toHaveBeenCalledWith('products');
    expect(ecommerceDeleteManyMock).toHaveBeenCalledWith({
      $or: [{ _id: 'product-12345678' }, { sourceProductId: 'product-12345678' }],
    });
    expect(listingCollectionMock).toHaveBeenCalledWith('product_listings');
    expect(listingUpdateManyMock).toHaveBeenCalledWith(
      { productId: 'product-12345678', integrationId: 'ecommerce-export' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'removed' }) })
    );
    expect(result).toEqual({
      success: true,
      productId: 'product-12345678',
      ecommerceDeletedCount: 1,
      listingDeletedCount: 1,
    });
  });
});
