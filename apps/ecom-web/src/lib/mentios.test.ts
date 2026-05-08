/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getProductsDb: vi.fn(),
  getEcommerceProductsDb: vi.fn(),
  hasProductsMongoConfig: vi.fn(),
  hasEcommerceProductsMongoConfig: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({
  getProductsDb: mocks.getProductsDb,
  getEcommerceProductsDb: mocks.getEcommerceProductsDb,
  hasProductsMongoConfig: mocks.hasProductsMongoConfig,
  hasEcommerceProductsMongoConfig: mocks.hasEcommerceProductsMongoConfig,
}));

import { getMentiosProducts } from './mentios';

const createCursor = <T>(docs: T[]) => {
  const cursor = {
    limit: vi.fn(() => cursor),
    project: vi.fn(() => cursor),
    skip: vi.fn(() => cursor),
    sort: vi.fn(() => cursor),
    toArray: vi.fn().mockResolvedValue(docs),
  };
  return cursor;
};

describe('Mentios product image mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasProductsMongoConfig.mockReturnValue(true);
    mocks.hasEcommerceProductsMongoConfig.mockReturnValue(true);
  });

  it('uses product image file public URLs when filepath is unavailable', async () => {
    const productDoc = {
      _id: 'product-1',
      catalogId: 'catalog-mentios',
      imageLinks: [],
      images: [
        {
          imageFileId: 'image-file-1',
          imageFile: {
            id: 'image-file-1',
            filepath: '',
            publicUrl: '/uploads/products/SKU_123/public.webp',
            url: 'https://files.example.test/uploads/products/SKU_123/url.webp',
          },
        },
      ],
      name_en: 'Spiritseer',
      price: 10,
      published: true,
      sku: 'SKU_123',
      stock: 1,
    };
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(1),
      find: vi.fn(() => createCursor([productDoc])),
    };
    const categoriesCollection = {
      find: vi.fn(() => createCursor([])),
    };
    const db = {
      collection: vi.fn((name: string) =>
        name === 'products' ? productsCollection : categoriesCollection
      ),
    };
    mocks.getProductsDb.mockResolvedValue(db);
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosProducts({ limit: 1 });

    expect(result.products[0]?.imageUrl).toBe(
      'https://sparksofsindri.com/uploads/products/SKU_123/public.webp'
    );
    expect(result.products[0]?.imageUrls).toEqual([
      'https://sparksofsindri.com/uploads/products/SKU_123/public.webp',
      'https://files.example.test/uploads/products/SKU_123/url.webp',
    ]);
  });

  it('pushes collection filters into the Mongo query before pagination', async () => {
    const productDoc = {
      _id: 'product-1',
      catalogId: 'catalog-mentios',
      collectionSlug: 'accessories',
      name_en: 'Arcane Charm',
      price: 10,
      published: true,
      sku: 'SKU_123',
      stock: 1,
    };
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(1),
      find: vi.fn(() => createCursor([productDoc])),
    };
    const categoriesCollection = {
      find: vi.fn(() => createCursor([])),
    };
    const db = {
      collection: vi.fn((name: string) =>
        name === 'products' ? productsCollection : categoriesCollection
      ),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosProducts({ collectionSlug: 'accessories', limit: 1 });

    expect(result.total).toBe(1);
    expect(productsCollection.find).toHaveBeenCalledTimes(1);
    const filter = productsCollection.find.mock.calls[0]?.[0];
    expect(JSON.stringify(filter)).toContain('"collectionSlug":"accessories"');
    expect(productsCollection.countDocuments).toHaveBeenCalledWith(filter);
  });
});
