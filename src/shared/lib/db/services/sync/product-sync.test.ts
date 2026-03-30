import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  syncProductDrafts,
  syncProductDraftsPrismaToMongo,
  syncProducts,
  syncProductsPrismaToMongo,
} from './product-sync';

type MockCollectionDocs = Record<string, unknown[]>;

const createMongo = (docsByCollection: MockCollectionDocs) =>
  ({
    collection: vi.fn((name: string) => ({
      find: vi.fn(() => ({
        toArray: vi.fn(async () => docsByCollection[name] ?? []),
      })),
      deleteMany: vi.fn(async () => ({ deletedCount: 0 })),
      insertMany: vi.fn(async (docs: unknown[]) => ({ insertedCount: docs.length })),
    })),
  }) as any;

const createProductPrisma = () =>
  ({
    producer: {
      findMany: vi.fn(async () => []),
    },
    productImage: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    },
    productCatalog: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    },
    productCategoryAssignment: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    },
    productTagAssignment: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    },
    productProducerAssignment: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    },
    productListing: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    productAiJob: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    product: {
      deleteMany: vi.fn(async () => ({ count: 4 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
      findMany: vi.fn(async () => []),
    },
    productDraft: {
      deleteMany: vi.fn(async () => ({ count: 2 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
      findMany: vi.fn(async () => []),
    },
    catalog: {
      findMany: vi.fn(async () => []),
    },
  }) as any;

const createContext = ({
  docsByCollection,
  prisma = createProductPrisma(),
}: {
  docsByCollection: MockCollectionDocs;
  prisma?: any;
}) =>
  ({
    mongo: createMongo(docsByCollection),
    prisma,
    normalizeId: (doc: { id?: unknown; _id?: unknown }) =>
      typeof doc.id === 'string'
        ? doc.id
        : typeof doc._id === 'string'
          ? doc._id
          : null,
    toDate: (value: unknown) => (value ? new Date(String(value)) : null),
    toJsonValue: (value: unknown) => value,
    toObjectIdMaybe: (value: string | null | undefined) => value ?? null,
  }) as any;

describe('product-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters missing producers and writes normalized product relation rows', async () => {
    const prisma = createProductPrisma();
    prisma.producer.findMany.mockResolvedValue([{ id: 'producer-1' }]);

    const context = createContext({
      prisma,
      docsByCollection: {
        products: [
          {
            id: 'product-1',
            sku: 'SKU-1',
            categoryId: 'category-1',
            producers: [
              { producerId: 'producer-1', assignedAt: '2026-03-01T00:00:00.000Z' },
              { producerId: 'missing-producer', assignedAt: '2026-03-02T00:00:00.000Z' },
              { producerId: 'producer-1', assignedAt: '2026-03-03T00:00:00.000Z' },
            ],
            images: [{ imageFileId: 'image-1', assignedAt: '2026-03-04T00:00:00.000Z' }],
            catalogs: [{ catalogId: 'catalog-1', assignedAt: '2026-03-05T00:00:00.000Z' }],
            tags: [{ tagId: 'tag-1', assignedAt: '2026-03-06T00:00:00.000Z' }],
            categories: [],
          },
        ],
      },
    });

    const result = await syncProducts(context);

    expect(prisma.product.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'product-1',
          sku: 'SKU-1',
        }),
      ],
    });
    expect(prisma.productCategoryAssignment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          productId: 'product-1',
          categoryId: 'category-1',
        }),
      ],
    });
    expect(prisma.productProducerAssignment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          productId: 'product-1',
          producerId: 'producer-1',
        }),
      ],
    });
    expect(result).toMatchObject({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
      warnings: ['Product product-1: missing producer missing-producer'],
    });
  });

  it('normalizes product drafts before inserting them into Prisma', async () => {
    const prisma = createProductPrisma();
    const context = createContext({
      prisma,
      docsByCollection: {
        product_drafts: [
          {
            id: 'draft-1',
            name: 'Draft Product',
            catalogIds: ['catalog-1'],
            tagIds: ['tag-1'],
            producerIds: ['producer-1'],
            parameters: [{ key: 'material', value: 'wood' }],
            iconColorMode: 'custom',
            iconColor: ' #ABCDEF ',
            active: false,
          },
        ],
      },
    });

    const result = await syncProductDrafts(context);

    expect(prisma.productDraft.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'draft-1',
          name: 'Draft Product',
          catalogIds: ['catalog-1'],
          tagIds: ['tag-1'],
          producerIds: ['producer-1'],
          parameters: [{ key: 'material', value: 'wood' }],
          iconColorMode: 'custom',
          iconColor: '#abcdef',
          active: false,
        }),
      ],
    });
    expect(result).toMatchObject({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
    });
  });

  it('falls back to empty arrays and null relations when syncing sparse products from Mongo', async () => {
    const prisma = createProductPrisma();
    prisma.producer.findMany.mockResolvedValue([]);

    const context = createContext({
      prisma,
      docsByCollection: {
        products: [
          {
            id: 'product-2',
            name_en: 'Chair',
            categoryId: 'category-9',
            categories: [{ categoryId: 'category-9', assignedAt: '2026-03-01T00:00:00.000Z' }],
            producers: [{ producerId: 'missing-producer' }],
          },
          {
            sku: 'missing-id',
          },
        ],
      },
    });

    const result = await syncProducts(context);

    expect(prisma.product.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'product-2',
          name_en: 'Chair',
        }),
      ],
    });
    expect(prisma.productCategoryAssignment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          productId: 'product-2',
          categoryId: 'category-9',
        }),
      ],
    });
    expect(result).toMatchObject({
      sourceCount: 1,
      targetInserted: 1,
      warnings: ['Product product-2: missing producer missing-producer'],
    });
  });

  it('writes denormalized products back to Mongo with catalogs, categories, images, and producers', async () => {
    const productsCollection = {
      deleteMany: vi.fn(async () => ({ deletedCount: 3 })),
      insertMany: vi.fn(async (docs: unknown[]) => ({ insertedCount: docs.length })),
    };
    const prisma = createProductPrisma();
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        sku: 'SKU-1',
        baseProductId: 'base-1',
        defaultPriceGroupId: 'group-1',
        ean: 'ean-1',
        gtin: 'gtin-1',
        asin: 'asin-1',
        name_en: 'Chair',
        name_pl: null,
        name_de: null,
        description_en: 'Desc',
        description_pl: null,
        description_de: null,
        supplierName: 'Supplier',
        supplierLink: 'https://example.com',
        priceComment: 'comment',
        stock: 8,
        price: 19.5,
        sizeLength: 10,
        sizeWidth: 5,
        weight: 2,
        length: 10,
        parameters: [{ key: 'material', value: 'wood' }],
        imageLinks: ['https://img'],
        imageBase64s: ['base64'],
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
        images: [
          {
            productId: 'product-1',
            imageFileId: 'file-1',
            assignedAt: new Date('2026-03-03T00:00:00.000Z'),
            imageFile: {
              id: 'file-1',
              filename: 'chair.png',
              filepath: '/chair.png',
              mimetype: 'image/png',
              size: 42,
              width: 100,
              height: 80,
              tags: ['featured'],
              createdAt: new Date('2026-03-03T00:00:00.000Z'),
              updatedAt: new Date('2026-03-03T00:00:00.000Z'),
            },
          },
        ],
        catalogs: [
          {
            productId: 'product-1',
            catalogId: 'catalog-1',
            assignedAt: new Date('2026-03-04T00:00:00.000Z'),
            catalog: {
              id: 'catalog-1',
              name: 'Main',
              description: 'Main catalog',
              isDefault: true,
              defaultLanguageId: 'en',
              defaultPriceGroupId: 'group-1',
              priceGroupIds: ['group-1'],
              createdAt: new Date('2026-03-04T00:00:00.000Z'),
              updatedAt: new Date('2026-03-04T00:00:00.000Z'),
            },
          },
        ],
        categories: [{ categoryId: 'category-1' }],
        tags: [{ tagId: 'tag-1', assignedAt: new Date('2026-03-05T00:00:00.000Z') }],
        producers: [{ producerId: 'producer-1', assignedAt: new Date('2026-03-06T00:00:00.000Z') }],
      },
    ]);
    prisma.catalog.findMany.mockResolvedValue([
      {
        id: 'catalog-1',
        languages: [
          { languageId: 'pl', position: 2 },
          { languageId: 'en', position: 1 },
        ],
      },
    ]);

    const context = {
      mongo: {
        collection: vi.fn((name: string) => {
          expect(name).toBe('products');
          return productsCollection;
        }),
      },
      prisma,
      toObjectIdMaybe: (value: string | null | undefined) => (value ? `oid:${value}` : null),
    } as any;

    const result = await syncProductsPrismaToMongo(context);

    expect(productsCollection.deleteMany).toHaveBeenCalledWith({});
    expect(productsCollection.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'oid:product-1',
        id: 'product-1',
        categoryId: 'category-1',
        categories: [
          expect.objectContaining({
            productId: 'product-1',
            categoryId: 'category-1',
          }),
        ],
        catalogs: [
          expect.objectContaining({
            catalog: expect.objectContaining({
              id: 'catalog-1',
              languageIds: ['en', 'pl'],
            }),
          }),
        ],
        images: [
          expect.objectContaining({
            imageFile: expect.objectContaining({
              id: 'file-1',
              filename: 'chair.png',
            }),
          }),
        ],
        producers: [
          expect.objectContaining({
            productId: 'product-1',
            producerId: 'producer-1',
          }),
        ],
      }),
    ]);
    expect(result).toEqual({
      sourceCount: 1,
      targetDeleted: 3,
      targetInserted: 1,
    });
  });

  it('writes product drafts back to Mongo with normalized optional fields', async () => {
    const draftsCollection = {
      deleteMany: vi.fn(async () => ({ deletedCount: 4 })),
      insertMany: vi.fn(async (docs: unknown[]) => ({ insertedCount: docs.length })),
    };
    const prisma = createProductPrisma();
    prisma.productDraft.findMany.mockResolvedValue([
      {
        id: 'draft-1',
        name: 'Draft Product',
        description: null,
        sku: 'SKU-1',
        ean: null,
        gtin: null,
        asin: null,
        name_en: 'Chair',
        name_pl: null,
        name_de: null,
        description_en: null,
        description_pl: null,
        description_de: null,
        weight: null,
        sizeLength: 10,
        sizeWidth: 5,
        length: null,
        price: 19.5,
        supplierName: null,
        supplierLink: null,
        priceComment: null,
        stock: 8,
        catalogIds: ['catalog-1'],
        categoryId: 'category-1',
        tagIds: ['tag-1'],
        producerIds: ['producer-1'],
        parameters: [{ key: 'material', value: 'wood' }],
        defaultPriceGroupId: 'group-1',
        active: true,
        icon: 'chair',
        iconColorMode: 'theme',
        iconColor: null,
        imageLinks: ['https://img'],
        baseProductId: null,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
      },
    ]);

    const context = {
      mongo: {
        collection: vi.fn((name: string) => {
          expect(name).toBe('product_drafts');
          return draftsCollection;
        }),
      },
      prisma,
      toObjectIdMaybe: (value: string | null | undefined) => (value ? `oid:${value}` : null),
    } as any;

    const result = await syncProductDraftsPrismaToMongo(context);

    expect(draftsCollection.deleteMany).toHaveBeenCalledWith({});
    expect(draftsCollection.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'oid:draft-1',
        id: 'draft-1',
        name: 'Draft Product',
        catalogIds: ['catalog-1'],
        tagIds: ['tag-1'],
        producerIds: ['producer-1'],
        imageLinks: ['https://img'],
      }),
    ]);
    expect(result).toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });
  });
});
