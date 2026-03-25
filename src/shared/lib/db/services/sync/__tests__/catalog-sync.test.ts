import { describe, expect, it, vi } from 'vitest';

import {
  syncCatalogs,
  syncCatalogsPrismaToMongo,
  syncPriceGroups,
  syncPriceGroupsPrismaToMongo,
  syncProductCategories,
  syncProductCategoriesPrismaToMongo,
  syncProductParameters,
  syncProductParametersPrismaToMongo,
  syncProductProducers,
  syncProductProducersPrismaToMongo,
  syncProductTags,
  syncProductTagsPrismaToMongo,
} from '@/shared/lib/db/services/sync/catalog-sync';

const createMongo = (docsByCollection: Record<string, unknown[]>) => {
  const collections = new Map<
    string,
    {
      find: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      insertMany: ReturnType<typeof vi.fn>;
    }
  >();

  const collection = vi.fn((name: string) => {
    if (!collections.has(name)) {
      collections.set(name, {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(docsByCollection[name] ?? []),
        }),
        deleteMany: vi.fn().mockResolvedValue({ deletedCount: 6 }),
        insertMany: vi.fn().mockResolvedValue({ insertedCount: (docsByCollection[name] ?? []).length }),
      });
    }
    return collections.get(name)!;
  });

  return {
    mongo: { collection } as unknown as Parameters<typeof syncPriceGroups>[0]['mongo'],
    collections,
  };
};

const baseContext = {
  normalizeId: (doc: Record<string, unknown>): string =>
    typeof doc._id === 'string' ? doc._id : typeof doc.id === 'string' ? doc.id : '',
  toDate: (value: unknown): Date | null => (value ? new Date(value as string | Date) : null),
  toObjectIdMaybe: (value: string) => value,
  toJsonValue: (value: unknown) => value,
  currencyCodes: new Set<string>(),
  countryCodes: new Set<string>(),
};

describe('catalog-sync', () => {
  it('syncs price groups and catalogs from Mongo to Prisma with warnings and joins', async () => {
    const createdAt = new Date('2026-03-25T18:00:00.000Z');
    const { mongo } = createMongo({
      price_groups: [
        {
          _id: 'group-1',
          groupId: 'retail',
          currencyId: 'USD',
          sourceGroupId: 'missing-group',
          name: 'Retail',
          description: 'Retail prices',
          type: 'standard',
          basePriceField: 'price',
          priceMultiplier: 1.25,
          addToPrice: 5,
          createdAt,
          updatedAt: createdAt,
        },
        {
          _id: 'group-2',
          currencyId: 'JPY',
          name: 'Unsupported',
        },
      ],
      catalogs: [
        {
          _id: 'catalog-1',
          name: 'Spring Catalog',
          defaultLanguageId: 'de',
          defaultPriceGroupId: 'group-2',
          languageIds: ['en', 'pl', 'missing-language'],
          priceGroupIds: ['group-1', 'group-x'],
          createdAt,
          updatedAt: createdAt,
        },
      ],
    });

    const prisma = {
      currency: {
        findMany: vi.fn().mockResolvedValue([{ id: 'USD' }]),
      },
      priceGroup: {
        findMany: vi.fn().mockResolvedValue([{ id: 'group-1' }]),
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      language: {
        findMany: vi.fn().mockResolvedValue([{ id: 'en' }, { id: 'pl' }]),
      },
      catalog: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      catalogLanguage: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
    } as unknown as Parameters<typeof syncPriceGroups>[0]['prisma'];

    const priceGroupResult = await syncPriceGroups({
      mongo,
      prisma,
      ...baseContext,
    });
    const catalogResult = await syncCatalogs({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(priceGroupResult).toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
      warnings: [
        'Price group group-1: missing source group missing-group',
        'Skipped price group group-2: missing currency JPY',
      ],
    });
    expect(catalogResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
      warnings: [
        'Catalog catalog-1: missing default language de',
        'Catalog catalog-1: missing default price group group-2',
        'Catalog catalog-1: filtered 1 missing languages',
        'Catalog catalog-1: filtered 1 missing price groups',
      ],
    });

    expect(prisma.priceGroup.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'group-1',
          currencyId: 'USD',
          sourceGroupId: null,
          priceMultiplier: 1.25,
          addToPrice: 5,
        }),
      ],
    });
    expect(prisma.catalog.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'catalog-1',
          defaultLanguageId: null,
          defaultPriceGroupId: null,
          priceGroupIds: ['group-1'],
        }),
      ],
    });
    expect(prisma.catalogLanguage.deleteMany).toHaveBeenCalledWith();
    expect(prisma.catalogLanguage.createMany).toHaveBeenCalledWith({
      data: [
        { catalogId: 'catalog-1', languageId: 'en', position: 0 },
        { catalogId: 'catalog-1', languageId: 'pl', position: 1 },
      ],
    });
  });

  it('syncs category, tag, producer, and parameter collections from Mongo to Prisma', async () => {
    const createdAt = new Date('2026-03-25T18:30:00.000Z');
    const { mongo } = createMongo({
      product_categories: [
        {
          _id: 'category-1',
          name_en: 'Shoes',
          description_en: 'Footwear',
          parentId: 'parent-1',
          catalogId: 'catalog-1',
          createdAt,
          updatedAt: createdAt,
        },
        {
          name_en: 'missing id',
        },
      ],
      product_tags: [
        {
          _id: 'tag-1',
          name: 'Featured',
          createdAt,
          updatedAt: createdAt,
        },
      ],
      product_producers: [
        {
          _id: 'producer-1',
          name: 'Acme',
          website: 'https://acme.test',
          createdAt,
          updatedAt: createdAt,
        },
        {
          _id: 'producer-2',
          name: ' acme ',
          createdAt,
          updatedAt: createdAt,
        },
      ],
      product_parameters: [
        {
          _id: 'parameter-1',
          catalogId: 'catalog-1',
          name_en: 'Color',
          name_pl: 'Kolor',
          name_de: 'Farbe',
          selectorType: 'select',
          optionLabels: ['red', 'blue'],
          createdAt,
          updatedAt: createdAt,
        },
      ],
    });

    const prisma = {
      productCategory: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      productTag: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      productProducerAssignment: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      producer: {
        deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      productParameter: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as Parameters<typeof syncProductCategories>[0]['prisma'];

    const categoriesResult = await syncProductCategories({
      mongo,
      prisma,
      ...baseContext,
    });
    const tagsResult = await syncProductTags({
      mongo,
      prisma,
      ...baseContext,
    });
    const producersResult = await syncProductProducers({
      mongo,
      prisma,
      ...baseContext,
    });
    const parametersResult = await syncProductParameters({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(categoriesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
    });
    expect(tagsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(producersResult).toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
      warnings: ['Skipped duplicate producer name: acme'],
    });
    expect(parametersResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });

    expect(prisma.productCategory.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'category-1',
          name: 'Shoes',
          description: 'Footwear',
          parentId: 'parent-1',
          catalogId: 'catalog-1',
        }),
      ],
    });
    expect(prisma.productTag.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'tag-1',
          name: 'Featured',
          catalogId: '',
        }),
      ],
    });
    expect(prisma.productProducerAssignment.deleteMany).toHaveBeenCalledWith();
    expect(prisma.producer.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'producer-1',
          name: 'Acme',
          website: 'https://acme.test',
        }),
      ],
    });
    expect(prisma.productParameter.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'parameter-1',
          selectorType: 'select',
          optionLabels: ['red', 'blue'],
        }),
      ],
    });
  });

  it('syncs catalog collections from Prisma back to Mongo', async () => {
    const createdAt = new Date('2026-03-25T19:00:00.000Z');
    const { mongo, collections } = createMongo({});

    const prisma = {
      priceGroup: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'group-1',
            groupId: 'retail',
            isDefault: true,
            name: 'Retail',
            description: 'Retail prices',
            currencyId: 'USD',
            type: 'standard',
            basePriceField: 'price',
            sourceGroupId: null,
            priceMultiplier: 1.1,
            addToPrice: 2,
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      catalog: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'catalog-1',
            name: 'Spring Catalog',
            description: 'Seasonal',
            isDefault: false,
            defaultLanguageId: 'pl',
            defaultPriceGroupId: 'group-1',
            priceGroupIds: ['group-1'],
            languages: [
              { languageId: 'en', position: 2 },
              { languageId: 'pl', position: 1 },
            ],
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      productCategory: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'category-1',
            name: 'Shoes',
            description: 'Footwear',
            color: '#fff',
            parentId: null,
            catalogId: 'catalog-1',
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      productTag: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'tag-1',
            name: 'Featured',
            color: '#000',
            catalogId: 'catalog-1',
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      producer: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'producer-1',
            name: 'Acme',
            website: 'https://acme.test',
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      productParameter: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'parameter-1',
            catalogId: 'catalog-1',
            name_en: 'Color',
            name_pl: 'Kolor',
            name_de: 'Farbe',
            selectorType: 'select',
            optionLabels: ['red', 'blue'],
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
    } as unknown as Parameters<typeof syncPriceGroupsPrismaToMongo>[0]['prisma'];

    const priceGroupsResult = await syncPriceGroupsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const catalogsResult = await syncCatalogsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const categoriesResult = await syncProductCategoriesPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const tagsResult = await syncProductTagsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const producersResult = await syncProductProducersPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const parametersResult = await syncProductParametersPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(priceGroupsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 6,
      targetInserted: 1,
    });
    expect(catalogsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 6,
      targetInserted: 1,
    });
    expect(categoriesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 6,
      targetInserted: 1,
    });
    expect(tagsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 6,
      targetInserted: 1,
    });
    expect(producersResult).toEqual({
      sourceCount: 1,
      targetDeleted: 6,
      targetInserted: 1,
    });
    expect(parametersResult).toEqual({
      sourceCount: 1,
      targetDeleted: 6,
      targetInserted: 1,
    });

    expect(collections.get('price_groups')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'group-1',
        groupId: 'retail',
        currencyId: 'USD',
      }),
    ]);
    expect(collections.get('catalogs')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'catalog-1',
        languageIds: ['pl', 'en'],
        priceGroupIds: ['group-1'],
      }),
    ]);
    expect(collections.get('product_categories')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'category-1',
        color: '#fff',
      }),
    ]);
    expect(collections.get('product_tags')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'tag-1',
        catalogId: 'catalog-1',
      }),
    ]);
    expect(collections.get('product_producers')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'producer-1',
        website: 'https://acme.test',
      }),
    ]);
    expect(collections.get('product_parameters')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'parameter-1',
        optionLabels: ['red', 'blue'],
      }),
    ]);
  });
});
