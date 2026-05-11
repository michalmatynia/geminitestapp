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

vi.mock('./mongodb', () => ({
  getProductsDb: mocks.getProductsDb,
  getEcommerceProductsDb: mocks.getEcommerceProductsDb,
  hasProductsMongoConfig: mocks.hasProductsMongoConfig,
  hasEcommerceProductsMongoConfig: mocks.hasEcommerceProductsMongoConfig,
}));

import { getMentiosCategories, getMentiosHomeStats, getMentiosProducts } from './mentios';

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

  it('pushes theme filters into the fifth pipe-delimited name segment', async () => {
    const productDoc = {
      _id: 'product-1',
      catalogId: 'catalog-mentios',
      name_en: 'Spinner | One Size | Metal | Movie Pendant | Blade Runner 2049',
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

    const result = await getMentiosProducts({ themeNames: ['Blade Runner 2049'], limit: 1 });

    expect(result.products[0]?.lore).toBe('Blade Runner 2049');
    const filter = productsCollection.find.mock.calls[0]?.[0];
    const filterText = JSON.stringify(filter);
    expect(filterText).toContain('Blade Runner 2049');
    expect(filterText).toContain('name_en');
    expect(filterText).toContain('{4}');
    expect(filterText).toContain('[^|]');
    expect(filterText).not.toContain('description_en');
    expect(productsCollection.countDocuments).toHaveBeenCalledWith(filter);
  });
});

describe('Mentios home stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasProductsMongoConfig.mockReturnValue(true);
    mocks.hasEcommerceProductsMongoConfig.mockReturnValue(true);
  });

  it('counts in-stock products, used leaf child categories, and unique lores', async () => {
    const productDocs = [
      {
        _id: 'product-1',
        categoryId: 'anime-ring',
        name_en: 'Juzo | Adjustable | Metal | Anime Ring | Tokyo Ghoul',
        stock: 4,
      },
      {
        _id: 'product-2',
        categoryId: 'anime-keychain',
        name_en: 'Ken | One Size | Acrylic | Anime Keychain | Tokyo Ghoul',
        stock: 2,
      },
      {
        _id: 'product-3',
        categoryId: 'gaming-parent',
        name_en: 'Rune | One Size | Metal | Gaming | Elden Ring',
        stock: 1,
      },
    ];
    const categoryDocs = [
      { _id: 'anime-parent', name_en: 'Anime' },
      { _id: 'anime-ring', parentId: 'anime-parent', name_en: 'Anime Ring' },
      { _id: 'anime-keychain', parentId: 'anime-parent', name_en: 'Anime Keychain' },
      { _id: 'gaming-parent', name_en: 'Gaming' },
      { _id: 'gaming-ring', parentId: 'gaming-parent', name_en: 'Gaming Ring' },
    ];
    const productsCollection = {
      find: vi.fn(() => createCursor(productDocs)),
    };
    const categoriesCollection = {
      find: vi.fn(() => createCursor(categoryDocs)),
    };
    const db = {
      collection: vi.fn((name: string) =>
        name === 'products' ? productsCollection : categoriesCollection
      ),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosHomeStats('en');

    expect(result).toEqual({
      itemCount: 3,
      categoryCount: 2,
      loreCount: 2,
    });
    expect(productsCollection.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $and: expect.arrayContaining([
          expect.objectContaining({ stock: { $ne: 0 } }),
        ]),
      }),
    );
  });

  it('returns null without console errors when Mongo stats are unavailable', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('SSL routines:ssl3_read_bytes:tlsv1 alert internal error');
    error.name = 'MongoServerSelectionError';
    mocks.getEcommerceProductsDb.mockRejectedValue(error);

    const result = await getMentiosHomeStats('en');

    expect(result).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe('Mentios categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasProductsMongoConfig.mockReturnValue(true);
    mocks.hasEcommerceProductsMongoConfig.mockReturnValue(true);
  });

  it('returns parent category names for child categories', async () => {
    const categoryDocs = [
      { _id: 'anime-parent', name_en: 'Anime' },
      { _id: 'anime-ring', parentId: 'anime-parent', name_en: 'Anime Ring' },
      { _id: 'movie-parent', name_en: 'Movie' },
      { _id: 'movie-wallet', parentId: 'movie-parent', name_en: 'Movie Wallet' },
    ];
    const productsCollection = {
      aggregate: vi.fn(() => createCursor([
        { _id: 'movie-wallet', count: 3 },
        { _id: 'anime-ring', count: 2 },
      ])),
    };
    const categoriesCollection = {
      find: vi.fn(() => createCursor(categoryDocs)),
    };
    const db = {
      collection: vi.fn((name: string) =>
        name === 'products' ? productsCollection : categoriesCollection
      ),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosCategories('en');

    expect(result).toEqual([
      { id: 'anime-ring', name: 'Anime Ring', parentName: 'Anime', count: 2 },
      { id: 'movie-wallet', name: 'Movie Wallet', parentName: 'Movie', count: 3 },
    ]);
  });
});
