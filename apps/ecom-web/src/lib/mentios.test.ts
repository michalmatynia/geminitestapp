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

import {
  getCanonicalProductPricing,
  getMentiosCategories,
  getMentiosHeroLoreGroups,
  getMentiosHomeStats,
  getMentiosProducts,
} from './mentios';

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
      find: vi.fn((_filter?: unknown) => createCursor([productDoc])),
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
      find: vi.fn((_filter?: unknown) => createCursor([productDoc])),
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
      find: vi.fn((_filter?: unknown) => createCursor([productDoc])),
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

  it('sorts catalog listings by the latest ecommerce export timestamp first', async () => {
    const productCursor = createCursor([]);
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(0),
      find: vi.fn(() => productCursor),
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

    await getMentiosProducts({ limit: 1 });

    expect(productCursor.sort).toHaveBeenCalledWith({
      updatedAt: -1,
      exportedAt: -1,
      createdAt: -1,
    });
  });

  it('uses the pipe-delimited category when exported category metadata is missing', async () => {
    const productDoc = {
      _id: 'product-1',
      catalogId: 'catalog-mentios',
      name_en: 'Container | 4 cm | Metal | Keychain Mini Dice | Dungeons and Dragons',
      price: 10,
      published: true,
      sku: 'KEYCHA1452',
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

    const result = await getMentiosProducts({ limit: 1, locale: 'pl' });

    expect(result.products[0]).toMatchObject({
      category: 'Keychain Mini Dice',
      collectionSlug: 'accessories',
      lore: 'Dungeons and Dragons',
      shortName: 'Container',
    });
  });

  it('recalculates display pricing from synced ecommerce price groups', async () => {
    const productDoc = {
      _id: 'product-1',
      catalogId: 'catalog-mentios',
      defaultPriceGroupId: 'group-base',
      name_en: 'Arcane Charm',
      price: 100,
      published: true,
      sku: 'SKU_123',
      stock: 1,
    };
    const priceGroupDocs = [
      {
        _id: 'group-base',
        currencyCode: 'USD',
        id: 'group-base',
        priceMultiplier: 1,
      },
      {
        _id: 'group-pln',
        currencyCode: 'PLN',
        id: 'group-pln',
        isDefault: true,
        priceMultiplier: 4,
        sourceGroupId: 'group-base',
        type: 'dependent',
        addToPrice: 9,
      },
    ];
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(1),
      find: vi.fn(() => createCursor([productDoc])),
    };
    const categoriesCollection = {
      find: vi.fn(() => createCursor([])),
    };
    const priceGroupsCollection = {
      find: vi.fn(() => createCursor(priceGroupDocs)),
    };
    const db = {
      collection: vi.fn((name: string) => {
        if (name === 'products') return productsCollection;
        if (name === 'price_groups') return priceGroupsCollection;
        return categoriesCollection;
      }),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosProducts({ limit: 1, locale: 'pl' });

    expect(result.products[0]).toMatchObject({
      currencyCode: 'PLN',
      price: 409,
      priceDisplay: '409 zł',
    });
  });

  it('prefers EUR price groups for English catalog pricing', async () => {
    const productDoc = {
      _id: 'product-en-eur',
      catalogId: 'catalog-mentios',
      defaultPriceGroupId: 'group-pln',
      name_en: 'English Currency Charm',
      price: 400,
      published: true,
      sku: 'SKU_EN_EUR',
      stock: 1,
    };
    const priceGroupDocs = [
      {
        _id: 'group-pln',
        currencyCode: 'PLN',
        id: 'group-pln',
        isDefault: true,
        priceMultiplier: 1,
      },
      {
        _id: 'group-eur',
        currencyCode: 'EUR',
        id: 'group-eur',
        priceMultiplier: 0.25,
        sourceGroupId: 'group-pln',
        type: 'dependent',
      },
    ];
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(1),
      find: vi.fn(() => createCursor([productDoc])),
    };
    const categoriesCollection = {
      find: vi.fn(() => createCursor([])),
    };
    const priceGroupsCollection = {
      find: vi.fn(() => createCursor(priceGroupDocs)),
    };
    const db = {
      collection: vi.fn((name: string) => {
        if (name === 'products') return productsCollection;
        if (name === 'price_groups') return priceGroupsCollection;
        return categoriesCollection;
      }),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosProducts({ limit: 1, locale: 'en' });

    expect(result.products[0]).toMatchObject({
      currencyCode: 'EUR',
      price: 100,
      priceDisplay: '€ 100',
    });
  });

  it('resolves EUR pricing through synced currency records and price group aliases', async () => {
    const productDoc = {
      _id: 'product-en-eur-currency-id',
      catalogId: 'catalog-mentios',
      defaultPriceGroupId: 'PLN_STANDARD',
      name_en: 'Currency Record Charm',
      price: 400,
      published: true,
      sku: 'SKU_EN_EUR_CURRENCY_ID',
      stock: 1,
    };
    const priceGroupDocs = [
      {
        _id: 'group-pln',
        currencyId: 'currency-pln',
        groupId: 'PLN_STANDARD',
        id: 'group-pln',
        isDefault: true,
        priceMultiplier: 1,
      },
      {
        _id: 'group-eur',
        currencyId: 'currency-eur',
        groupId: 'EUR_RETAIL',
        id: 'group-eur',
        priceMultiplier: 0.25,
        sourceGroupId: 'PLN_STANDARD',
        type: 'dependent',
      },
    ];
    const currencyDocs = [
      { _id: 'currency-pln-db-id', code: 'PLN', id: 'currency-pln' },
      { _id: 'currency-eur-db-id', code: 'EUR', id: 'currency-eur' },
    ];
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(1),
      find: vi.fn(() => createCursor([productDoc])),
    };
    const categoriesCollection = {
      find: vi.fn(() => createCursor([])),
    };
    const currenciesCollection = {
      find: vi.fn(() => createCursor(currencyDocs)),
    };
    const priceGroupsCollection = {
      find: vi.fn(() => createCursor(priceGroupDocs)),
    };
    const db = {
      collection: vi.fn((name: string) => {
        if (name === 'products') return productsCollection;
        if (name === 'price_groups') return priceGroupsCollection;
        if (name === 'currencies') return currenciesCollection;
        return categoriesCollection;
      }),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosProducts({ limit: 1, locale: 'en' });

    expect(result.products[0]).toMatchObject({
      currencyCode: 'EUR',
      price: 100,
      priceDisplay: '€ 100',
    });
  });

  it('recalculates source-price-backed pricing from synced ecommerce price groups', async () => {
    const productDoc = {
      _id: 'product-source-price',
      catalogId: 'catalog-mentios',
      defaultPriceGroupId: 'group-eur',
      name_en: 'Imported Charm',
      price: null,
      published: true,
      sku: 'SKU_SOURCE',
      sourcePrice: 370,
      sourcePriceCurrencyCode: 'PLN',
      stock: 1,
    };
    const priceGroupDocs = [
      {
        _id: 'group-pln',
        currencyCode: 'PLN',
        id: 'group-pln',
        priceMultiplier: 1,
      },
      {
        _id: 'group-eur',
        currencyCode: 'EUR',
        id: 'group-eur',
        isDefault: true,
        priceMultiplier: 0.28,
        sourceGroupId: 'group-pln',
        type: 'dependent',
      },
    ];
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(1),
      find: vi.fn(() => createCursor([productDoc])),
    };
    const categoriesCollection = {
      find: vi.fn(() => createCursor([])),
    };
    const priceGroupsCollection = {
      find: vi.fn(() => createCursor(priceGroupDocs)),
    };
    const db = {
      collection: vi.fn((name: string) => {
        if (name === 'products') return productsCollection;
        if (name === 'price_groups') return priceGroupsCollection;
        return categoriesCollection;
      }),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosProducts({ limit: 1 });

    expect(result.products[0]).toMatchObject({
      currencyCode: 'EUR',
      price: 103.6,
      priceDisplay: '€ 103.60',
    });
  });

  it('uses exported source currency when pricing groups are unavailable', async () => {
    const productDoc = {
      _id: 'product-source-currency-fallback',
      catalogId: 'catalog-mentios',
      defaultPriceGroupId: 'source-default-group',
      name_en: 'Fallback Charm',
      price: 370,
      published: true,
      sku: 'SKU_FALLBACK',
      sourcePrice: 370,
      sourcePriceCurrencyCode: 'USD',
      stock: 1,
    };
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(1),
      find: vi.fn(() => createCursor([productDoc])),
    };
    const db = {
      collection: vi.fn((name: string) => {
        if (name === 'products') return productsCollection;
        return { find: vi.fn(() => createCursor([])) };
      }),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosProducts({ limit: 1, locale: 'pl' });

    expect(result.products[0]).toMatchObject({
      currencyCode: 'USD',
      price: 370,
      priceDisplay: '$ 370',
    });
  });

  it('returns canonical checkout pricing from source-price-backed ecommerce price groups', async () => {
    const productDoc = {
      _id: 'product-source-price',
      catalogId: 'catalog-mentios',
      defaultPriceGroupId: 'group-eur',
      price: null,
      sourcePrice: 370,
      sourcePriceCurrencyCode: 'PLN',
      sourceProductId: 'gemini-product-1',
    };
    const priceGroupDocs = [
      {
        _id: 'group-pln',
        currencyCode: 'PLN',
        id: 'group-pln',
        priceMultiplier: 1,
      },
      {
        _id: 'group-eur',
        currencyCode: 'EUR',
        id: 'group-eur',
        isDefault: true,
        priceMultiplier: 0.28,
        sourceGroupId: 'group-pln',
        type: 'dependent',
      },
    ];
    const productsCollection = {
      find: vi.fn(() => createCursor([productDoc])),
    };
    const priceGroupsCollection = {
      find: vi.fn(() => createCursor(priceGroupDocs)),
    };
    const db = {
      collection: vi.fn((name: string) => {
        if (name === 'products') return productsCollection;
        if (name === 'price_groups') return priceGroupsCollection;
        return { find: vi.fn(() => createCursor([])) };
      }),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getCanonicalProductPricing(['gemini-product-1']);

    expect(result.get('gemini-product-1')).toEqual({
      currencyCode: 'EUR',
      price: 103.6,
    });
    expect(result.get('product-source-price')).toEqual({
      currencyCode: 'EUR',
      price: 103.6,
    });
  });

  it('resolves ecommerce price group dependencies through groupId aliases', async () => {
    const productDoc = {
      _id: 'product-noncanonical-source-group',
      catalogId: 'catalog-mentios',
      defaultPriceGroupId: 'group-eur',
      name_en: 'Canonical Only Charm',
      price: null,
      published: true,
      sku: 'SKU_CANONICAL_ONLY',
      sourcePrice: 370,
      sourcePriceCurrencyCode: 'PLN',
      stock: 1,
    };
    const priceGroupDocs = [
      {
        _id: 'group-pln',
        currencyCode: 'PLN',
        groupId: 'PLN_STANDARD',
        id: 'group-pln',
        priceMultiplier: 1,
      },
      {
        _id: 'group-eur',
        currencyCode: 'EUR',
        groupId: 'EUR_RETAIL',
        id: 'group-eur',
        isDefault: true,
        priceMultiplier: 0.28,
        sourceGroupId: 'PLN_STANDARD',
        type: 'dependent',
      },
    ];
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(1),
      find: vi.fn(() => createCursor([productDoc])),
    };
    const priceGroupsCollection = {
      find: vi.fn(() => createCursor(priceGroupDocs)),
    };
    const db = {
      collection: vi.fn((name: string) => {
        if (name === 'products') return productsCollection;
        if (name === 'price_groups') return priceGroupsCollection;
        return { find: vi.fn(() => createCursor([])) };
      }),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosProducts({ limit: 1, locale: 'en' });

    expect(result.products[0]).toMatchObject({
      currencyCode: 'EUR',
      price: 103.6,
      priceDisplay: '€ 103.60',
    });
  });

  it('sorts catalog products by resolved ecommerce price instead of raw stored price', async () => {
    const productDocs = [
      {
        _id: 'raw-cheaper',
        catalogId: 'catalog-mentios',
        defaultPriceGroupId: 'group-pln-source',
        name_en: 'Raw Cheaper',
        price: 50,
        published: true,
        sourcePrice: 200,
      },
      {
        _id: 'resolved-cheaper',
        catalogId: 'catalog-mentios',
        defaultPriceGroupId: 'group-pln-source',
        name_en: 'Resolved Cheaper',
        price: 100,
        published: true,
        sourcePrice: 10,
      },
    ];
    const productCursor = createCursor(productDocs);
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(productDocs.length),
      find: vi.fn(() => productCursor),
    };
    const categoriesCollection = {
      find: vi.fn(() => createCursor([])),
    };
    const priceGroupsCollection = {
      find: vi.fn(() => createCursor([{
        _id: 'group-pln-source',
        basePriceField: 'sourcePrice',
        currencyCode: 'PLN',
        id: 'group-pln-source',
        isDefault: true,
        priceMultiplier: 1,
      }])),
    };
    const db = {
      collection: vi.fn((name: string) => {
        if (name === 'products') return productsCollection;
        if (name === 'price_groups') return priceGroupsCollection;
        return categoriesCollection;
      }),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosProducts({ sort: 'price-asc', limit: 2 });

    expect(result.products.map((product) => product.id)).toEqual([
      'resolved-cheaper',
      'raw-cheaper',
    ]);
    expect(result.products.map((product) => product.price)).toEqual([10, 200]);
    expect(productsCollection.countDocuments).not.toHaveBeenCalled();
    expect(productCursor.sort).toHaveBeenCalledWith({
      updatedAt: -1,
      exportedAt: -1,
      createdAt: -1,
    });
  });

  it('filters catalog products by resolved ecommerce price instead of raw stored price', async () => {
    const productDocs = [
      {
        _id: 'raw-price-in-range',
        catalogId: 'catalog-mentios',
        defaultPriceGroupId: 'group-pln-source',
        name_en: 'Raw Price In Range',
        price: 15,
        published: true,
        sourcePrice: 200,
      },
      {
        _id: 'resolved-price-in-range',
        catalogId: 'catalog-mentios',
        defaultPriceGroupId: 'group-pln-source',
        name_en: 'Resolved Price In Range',
        price: 100,
        published: true,
        sourcePrice: 15,
      },
    ];
    const productsCollection = {
      countDocuments: vi.fn().mockResolvedValue(productDocs.length),
      find: vi.fn(() => createCursor(productDocs)),
    };
    const priceGroupsCollection = {
      find: vi.fn(() => createCursor([{
        _id: 'group-pln-source',
        basePriceField: 'sourcePrice',
        currencyCode: 'PLN',
        id: 'group-pln-source',
        isDefault: true,
        priceMultiplier: 1,
      }])),
    };
    const db = {
      collection: vi.fn((name: string) => {
        if (name === 'products') return productsCollection;
        if (name === 'price_groups') return priceGroupsCollection;
        return { find: vi.fn(() => createCursor([])) };
      }),
    };
    mocks.getEcommerceProductsDb.mockResolvedValue(db);

    const result = await getMentiosProducts({ priceMin: 10, priceMax: 20, limit: 10 });

    expect(result.total).toBe(1);
    expect(result.products.map((product) => product.id)).toEqual(['resolved-price-in-range']);
    expect(result.products[0]?.price).toBe(15);
    expect(productsCollection.countDocuments).not.toHaveBeenCalled();
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

describe('Mentios hero lore groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasProductsMongoConfig.mockReturnValue(true);
    mocks.hasEcommerceProductsMongoConfig.mockReturnValue(true);
  });

  it('groups unique product lores by anime, movie, and gaming categories', async () => {
    const productDocs = [
      {
        _id: 'anime-1',
        categoryId: 'anime-ring',
        name_en: 'Juzo | Adjustable | Metal | Anime Ring | Tokyo Ghoul',
        stock: 4,
      },
      {
        _id: 'anime-2',
        categoryId: 'anime-keychain',
        name_en: 'Tanjiro | One Size | Acrylic | Anime Keychain | Demon Slayer',
        stock: 2,
      },
      {
        _id: 'anime-duplicate',
        categoryId: 'anime-keychain',
        name_en: 'Ken | One Size | Acrylic | Anime Keychain | Tokyo Ghoul',
        stock: 1,
      },
      {
        _id: 'movie-1',
        categoryId: 'movie-wallet',
        name_en: 'Trooper | One Size | PU | Movie Wallet | Star Wars',
        stock: 2,
      },
      {
        _id: 'gaming-1',
        categoryId: 'gaming-pin',
        name_en: 'Rune | One Size | Metal | Gaming Pin | Elden Ring',
        stock: 1,
      },
      {
        _id: 'fallback-category',
        categoryName_en: 'Movie Ring',
        name_en: 'Deckard | One Size | Metal | Movie Ring | Blade Runner 2049',
        stock: 1,
      },
      {
        _id: 'polish-movie-category',
        categoryName_pl: 'Filmowy brelok',
        name_pl: 'Wybraniec | One Size | Metal | Filmowy brelok | The Matrix',
        stock: 1,
      },
    ];
    const categoryDocs = [
      { _id: 'anime-parent', name_en: 'Anime' },
      { _id: 'anime-ring', parentId: 'anime-parent', name_en: 'Anime Ring' },
      { _id: 'anime-keychain', parentId: 'anime-parent', name_en: 'Anime Keychain' },
      { _id: 'movie-parent', name_en: 'Movie' },
      { _id: 'movie-wallet', parentId: 'movie-parent', name_en: 'Movie Wallet' },
      { _id: 'gaming-parent', name_en: 'Gaming' },
      { _id: 'gaming-pin', parentId: 'gaming-parent', name_en: 'Gaming Pin' },
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

    const result = await getMentiosHeroLoreGroups('en');

    expect(result).toEqual({
      anime: ['Demon Slayer', 'Tokyo Ghoul'],
      gaming: ['Elden Ring'],
      movie: ['Blade Runner 2049', 'Star Wars', 'The Matrix'],
    });
  });

  it('returns empty groups when ecommerce MongoDB is not configured', async () => {
    mocks.hasEcommerceProductsMongoConfig.mockReturnValue(false);

    const result = await getMentiosHeroLoreGroups('en');

    expect(result).toEqual({ anime: [], gaming: [], movie: [] });
  });

  it('returns empty groups when the DB throws', async () => {
    mocks.getEcommerceProductsDb.mockRejectedValue(new Error('connection refused'));

    const result = await getMentiosHeroLoreGroups('en');

    expect(result).toEqual({ anime: [], gaming: [], movie: [] });
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
