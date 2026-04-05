import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { mongoCatalogRepository } from './mongo-catalog-repository';

const createPriceGroupCursor = () => ({
  toArray: vi.fn().mockResolvedValue([
    { id: 'group-pln', groupId: 'PLN_STANDARD' },
    { id: 'group-eur', groupId: 'EUR_STANDARD' },
  ]),
});

describe('mongoCatalogRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes legacy price group identifiers when listing catalogs', async () => {
    const findCatalogs = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            _id: 'catalog-1',
            id: 'catalog-1',
            name: 'Catalog',
            description: null,
            isDefault: false,
            defaultLanguageId: null,
            defaultPriceGroupId: 'PLN_STANDARD',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            languageIds: [],
            priceGroupIds: ['PLN_STANDARD', 'group-eur'],
          },
        ]),
      }),
    });
    const find = vi.fn().mockReturnValue(createPriceGroupCursor());

    mocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'catalogs') {
          return { find: findCatalogs };
        }
        if (name === 'price_groups') {
          return { find };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });

    const result = await mongoCatalogRepository.listCatalogs();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'catalog-1',
        priceGroupIds: ['group-pln', 'group-eur'],
        defaultPriceGroupId: 'group-pln',
      }),
    ]);
  });

  it('trims catalog price group identifiers in list responses', async () => {
    const findCatalogs = vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            _id: 'catalog-1',
            id: 'catalog-1',
            name: 'Catalog',
            description: null,
            isDefault: false,
            defaultLanguageId: null,
            defaultPriceGroupId: ' group-pln ',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-02T00:00:00.000Z'),
            languageIds: [],
            priceGroupIds: [' group-pln ', 'group-eur', 'group-eur', ''],
          },
        ]),
      }),
    });

    mocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'catalogs') {
          return { find: findCatalogs };
        }
        if (name === 'price_groups') {
          return {
            find: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });

    const result = await mongoCatalogRepository.listCatalogs();

    expect(result).toEqual([
      expect.objectContaining({
        id: 'catalog-1',
        priceGroupIds: ['group-pln', 'group-eur'],
        defaultPriceGroupId: 'group-pln',
      }),
    ]);
  });

  it('normalizes legacy price group identifiers when reading a single catalog', async () => {
    const findOne = vi.fn().mockResolvedValue({
      _id: 'catalog-1',
      id: 'catalog-1',
      name: 'Catalog',
      description: null,
      isDefault: false,
      defaultLanguageId: null,
      defaultPriceGroupId: 'PLN_STANDARD',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      languageIds: [],
      priceGroupIds: ['PLN_STANDARD', 'group-eur'],
    });
    const find = vi.fn().mockReturnValue(createPriceGroupCursor());

    mocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'catalogs') {
          return { findOne };
        }
        if (name === 'price_groups') {
          return { find };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });

    const result = await mongoCatalogRepository.getCatalogById('catalog-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'catalog-1',
        priceGroupIds: ['group-pln', 'group-eur'],
        defaultPriceGroupId: 'group-pln',
      })
    );
  });

  it('normalizes legacy price group identifiers when reading catalogs by ids', async () => {
    const toArray = vi.fn().mockResolvedValue([
      {
        _id: 'catalog-1',
        id: 'catalog-1',
        name: 'Catalog 1',
        description: null,
        isDefault: false,
        defaultLanguageId: null,
        defaultPriceGroupId: 'PLN_STANDARD',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        languageIds: [],
        priceGroupIds: ['PLN_STANDARD', 'group-eur'],
      },
      {
        _id: 'catalog-2',
        id: 'catalog-2',
        name: 'Catalog 2',
        description: null,
        isDefault: false,
        defaultLanguageId: null,
        defaultPriceGroupId: 'group-eur',
        createdAt: new Date('2026-01-03T00:00:00.000Z'),
        updatedAt: new Date('2026-01-04T00:00:00.000Z'),
        languageIds: [],
        priceGroupIds: ['group-eur'],
      },
    ]);
    const findCatalogs = vi.fn().mockReturnValue({ toArray });
    const find = vi.fn().mockReturnValue(createPriceGroupCursor());

    mocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'catalogs') {
          return { find: findCatalogs };
        }
        if (name === 'price_groups') {
          return { find };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });

    const result = await mongoCatalogRepository.getCatalogsByIds(['catalog-1', 'catalog-2']);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'catalog-1',
        priceGroupIds: ['group-pln', 'group-eur'],
        defaultPriceGroupId: 'group-pln',
      }),
      expect.objectContaining({
        id: 'catalog-2',
        priceGroupIds: ['group-eur'],
        defaultPriceGroupId: 'group-eur',
      }),
    ]);
  });

  it('normalizes legacy price group identifiers on create', async () => {
    const insertOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const updateMany = vi.fn().mockResolvedValue({ acknowledged: true });
    const find = vi.fn().mockReturnValue(createPriceGroupCursor());

    mocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'catalogs') {
          return { insertOne, updateMany };
        }
        if (name === 'price_groups') {
          return { find };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });

    const result = await mongoCatalogRepository.createCatalog({
      name: 'Catalog',
      isDefault: false,
      languageIds: [],
      priceGroupIds: ['PLN_STANDARD', 'group-eur'],
      defaultPriceGroupId: 'PLN_STANDARD',
    });

    expect(insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        priceGroupIds: ['group-pln', 'group-eur'],
        defaultPriceGroupId: 'group-pln',
      })
    );
    expect(result.priceGroupIds).toEqual(['group-pln', 'group-eur']);
    expect(result.defaultPriceGroupId).toBe('group-pln');
  });

  it('normalizes legacy price group identifiers on update', async () => {
    const updateMany = vi.fn().mockResolvedValue({ acknowledged: true });
    const find = vi.fn().mockReturnValue(createPriceGroupCursor());
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const findOneAndUpdate = vi.fn().mockResolvedValue({
      _id: 'catalog-1',
      id: 'catalog-1',
      name: 'Catalog',
      description: null,
      isDefault: false,
      defaultLanguageId: null,
      defaultPriceGroupId: 'group-pln',
      createdAt,
      updatedAt,
      languageIds: [],
      priceGroupIds: ['group-pln', 'group-eur'],
    });

    mocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'catalogs') {
          return { findOneAndUpdate, updateMany };
        }
        if (name === 'price_groups') {
          return { find };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });

    const result = await mongoCatalogRepository.updateCatalog('catalog-1', {
      priceGroupIds: ['PLN_STANDARD', 'EUR_STANDARD'],
      defaultPriceGroupId: 'PLN_STANDARD',
    });

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({
          priceGroupIds: ['group-pln', 'group-eur'],
          defaultPriceGroupId: 'group-pln',
        }),
      }),
      expect.anything()
    );
    expect(result?.priceGroupIds).toEqual(['group-pln', 'group-eur']);
    expect(result?.defaultPriceGroupId).toBe('group-pln');
  });

  it('normalizes legacy stored price group identifiers on update responses even when pricing fields are unchanged', async () => {
    const updateMany = vi.fn().mockResolvedValue({ acknowledged: true });
    const find = vi.fn().mockReturnValue(createPriceGroupCursor());
    const updatedAt = new Date('2026-01-02T00:00:00.000Z');
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const findOneAndUpdate = vi.fn().mockResolvedValue({
      _id: 'catalog-1',
      id: 'catalog-1',
      name: 'Renamed Catalog',
      description: null,
      isDefault: false,
      defaultLanguageId: null,
      defaultPriceGroupId: 'PLN_STANDARD',
      createdAt,
      updatedAt,
      languageIds: [],
      priceGroupIds: ['PLN_STANDARD', 'group-eur'],
    });

    mocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'catalogs') {
          return { findOneAndUpdate, updateMany };
        }
        if (name === 'price_groups') {
          return { find };
        }
        throw new Error(`Unexpected collection ${name}`);
      },
    });

    const result = await mongoCatalogRepository.updateCatalog('catalog-1', {
      name: 'Renamed Catalog',
    });

    expect(result?.priceGroupIds).toEqual(['group-pln', 'group-eur']);
    expect(result?.defaultPriceGroupId).toBe('group-pln');
  });
});
