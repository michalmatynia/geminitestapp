import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRODUCT_CATEGORY_FILTER_UNASSIGNED_VALUE } from '@/shared/lib/products/constants';

const {
  categoryFindMock,
  categoryFindOneMock,
  categoryToArrayMock,
  customFieldFindMock,
  customFieldToArrayMock,
  getMongoDbMock,
  integrationFindMock,
  integrationToArrayMock,
  listingFindMock,
  listingToArrayMock,
  loadMongoBaseExportLookupContextMock,
  loggerInfoMock,
} = vi.hoisted(() => ({
  categoryFindMock: vi.fn(),
  categoryFindOneMock: vi.fn(),
  categoryToArrayMock: vi.fn(),
  customFieldFindMock: vi.fn(),
  customFieldToArrayMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  integrationFindMock: vi.fn(),
  integrationToArrayMock: vi.fn(),
  listingFindMock: vi.fn(),
  listingToArrayMock: vi.fn(),
  loadMongoBaseExportLookupContextMock: vi.fn(),
  loggerInfoMock: vi.fn(),
}));

vi.mock('./mongo-product-repository.helpers', async () => {
  const actual = await vi.importActual<typeof import('./mongo-product-repository.helpers')>(
    './mongo-product-repository.helpers'
  );
  return {
    ...actual,
    loadMongoBaseExportLookupContext: () => loadMongoBaseExportLookupContextMock(),
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: () => getMongoDbMock(),
}));

vi.mock('@/shared/utils/logger', () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  buildAdvancedMongoWhere,
  buildMongoBaseExportedCondition,
  buildMongoExportedByBaseProductIdCondition,
  buildMongoUnexportedByBaseProductIdCondition,
  buildMongoWhere,
} from './mongo-product-repository.filters';

const baseExportContext = {
  integrationLookupValues: ['base-linker'],
  exportedProductIds: ['product-1'],
  exportedProductLookupValues: ['507f1f77bcf86cd799439011'],
};

describe('mongo-product-repository.filters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadMongoBaseExportLookupContextMock.mockResolvedValue(baseExportContext);
    categoryFindOneMock.mockResolvedValue(null);
    categoryToArrayMock.mockResolvedValue([]);
    categoryFindMock.mockReturnValue({ toArray: categoryToArrayMock });
    customFieldToArrayMock.mockResolvedValue([]);
    customFieldFindMock.mockReturnValue({ toArray: customFieldToArrayMock });
    integrationToArrayMock.mockResolvedValue([{ _id: 'integration-tradera' }]);
    integrationFindMock.mockReturnValue({ toArray: integrationToArrayMock });
    listingToArrayMock.mockResolvedValue([]);
    listingFindMock.mockReturnValue({ toArray: listingToArrayMock });
    getMongoDbMock.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'integrations') {
          return {
            find: integrationFindMock,
          };
        }
        if (name === 'product_listings') {
          return {
            find: listingFindMock,
          };
        }
        if (name === 'product_custom_fields') {
          return {
            find: customFieldFindMock,
          };
        }
        return {
          findOne: categoryFindOneMock,
          find: categoryFindMock,
        };
      },
    });
  });

  it('builds explicit base-exported and unexported filters', () => {
    expect(buildMongoExportedByBaseProductIdCondition()).toEqual({
      baseProductId: { $exists: true, $nin: [null, ''] },
    });
    expect(buildMongoUnexportedByBaseProductIdCondition()).toEqual({
      $or: [
        { baseProductId: { $exists: false } },
        { baseProductId: null },
        { baseProductId: '' },
      ],
    });

    expect(
      buildMongoBaseExportedCondition(true, {
        integrationLookupValues: [],
        exportedProductIds: [],
        exportedProductLookupValues: [],
      })
    ).toEqual({
      id: '__no_base_exported_products__',
    });

    expect(buildMongoBaseExportedCondition(false, baseExportContext)).toEqual({
      $and: [
        {
          $or: [
            { baseProductId: { $exists: false } },
            { baseProductId: null },
            { baseProductId: '' },
          ],
        },
        { id: { $nin: ['product-1'] } },
        { _id: { $nin: ['507f1f77bcf86cd799439011'] } },
      ],
    });

    expect(buildMongoBaseExportedCondition(true, baseExportContext)).toEqual({
      $or: [
        { baseProductId: { $exists: true, $nin: [null, ''] } },
        { id: { $in: ['product-1'] } },
        { _id: { $in: ['507f1f77bcf86cd799439011'] } },
      ],
    });

    expect(
      buildMongoBaseExportedCondition(false, {
        integrationLookupValues: [],
        exportedProductIds: [],
        exportedProductLookupValues: [],
      })
    ).toBeNull();
  });

  it('compiles advanced filters across string, numeric, nested-id, date, boolean, and not branches', async () => {
    const payload = JSON.stringify({
      type: 'group',
      id: 'root',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'name',
          field: 'name',
          operator: 'contains',
          value: 'Alpha',
        },
        {
          type: 'condition',
          id: 'price',
          field: 'price',
          operator: 'between',
          value: 10,
          valueTo: 20,
        },
        {
          type: 'condition',
          id: 'catalog',
          field: 'catalogId',
          operator: 'in',
          value: ['catalog-a', 'catalog-b'],
        },
        {
          type: 'condition',
          id: 'published',
          field: 'published',
          operator: 'eq',
          value: true,
        },
        {
          type: 'condition',
          id: 'base-exported',
          field: 'baseExported',
          operator: 'neq',
          value: true,
        },
        {
          type: 'group',
          id: 'nested',
          combinator: 'or',
          not: true,
          rules: [
            {
              type: 'condition',
              id: 'created',
              field: 'createdAt',
              operator: 'gte',
              value: '2026-01-01T00:00:00.000Z',
            },
            {
              type: 'condition',
              id: 'stock',
              field: 'stock',
              operator: 'isEmpty',
            },
          ],
        },
      ],
    });

    const result = await buildAdvancedMongoWhere(payload, baseExportContext);

    expect(result).toMatchObject({
      $and: [
        {
          $or: [
            { name_en: { $regex: 'Alpha', $options: 'i' } },
            { name_pl: { $regex: 'Alpha', $options: 'i' } },
            { name_de: { $regex: 'Alpha', $options: 'i' } },
          ],
        },
        { price: { $gte: 10, $lte: 20 } },
        { 'catalogs.catalogId': { $in: ['catalog-a', 'catalog-b'] } },
        { published: true },
        {
          $and: [
            {
              $or: [
                { baseProductId: { $exists: false } },
                { baseProductId: null },
                { baseProductId: '' },
              ],
            },
            { id: { $nin: ['product-1'] } },
            { _id: { $nin: ['507f1f77bcf86cd799439011'] } },
          ],
        },
        {
          $nor: [
            {
              $or: [
                { createdAt: { $gte: new Date('2026-01-01T00:00:00.000Z') } },
                { $or: [{ stock: { $exists: false } }, { stock: null }] },
              ],
            },
          ],
        },
      ],
    });
    expect(loggerInfoMock).toHaveBeenCalledWith(
      '[products.advanced-filter.mongo] compiled',
      expect.objectContaining({
        compiled: true,
        rules: 8,
        depth: 2,
        setItems: 2,
      })
    );
  });

  it('returns null when the advanced filter payload is invalid', async () => {
    await expect(buildAdvancedMongoWhere('{bad-json', baseExportContext)).resolves.toBeNull();
    expect(loggerInfoMock).not.toHaveBeenCalled();
  });

  it('compiles additional advanced operators for ids, strings, nested ids, dates, booleans, and base-export state', async () => {
    const payload = JSON.stringify({
      type: 'group',
      id: 'root-extra',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'id-contains',
          field: 'id',
          operator: 'contains',
          value: '507f',
        },
        {
          type: 'condition',
          id: 'description-not-empty',
          field: 'description',
          operator: 'isNotEmpty',
        },
        {
          type: 'condition',
          id: 'category-neq',
          field: 'categoryId',
          operator: 'neq',
          value: 'category-2',
        },
        {
          type: 'condition',
          id: 'tag-not-in',
          field: 'tagId',
          operator: 'notIn',
          value: ['tag-a', 'tag-b'],
        },
        {
          type: 'condition',
          id: 'producer-empty',
          field: 'producerId',
          operator: 'isEmpty',
        },
        {
          type: 'condition',
          id: 'created-between',
          field: 'createdAt',
          operator: 'between',
          value: '2026-02-10T00:00:00.000Z',
          valueTo: '2026-02-01T00:00:00.000Z',
        },
        {
          type: 'condition',
          id: 'published-neq',
          field: 'published',
          operator: 'neq',
          value: false,
        },
        {
          type: 'condition',
          id: 'base-product-not-empty',
          field: 'baseProductId',
          operator: 'isNotEmpty',
        },
        {
          type: 'condition',
          id: 'base-exported-eq',
          field: 'baseExported',
          operator: 'eq',
          value: true,
        },
      ],
    });

    const result = await buildAdvancedMongoWhere(payload, baseExportContext);

    expect(result).toMatchObject({
      $and: [
        {
          $or: [
            { id: { $regex: '507f', $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$_id' },
                  regex: '507f',
                  options: 'i',
                },
              },
            },
          ],
        },
        {
          $or: [
            { description_en: { $exists: true, $nin: [null, ''] } },
            { description_pl: { $exists: true, $nin: [null, ''] } },
            { description_de: { $exists: true, $nin: [null, ''] } },
          ],
        },
        {
          $nor: [{ categoryId: 'category-2' }],
        },
        {
          'tags.tagId': { $nin: ['tag-a', 'tag-b'] },
        },
        {
          $or: [
            { 'producers.producerId': { $exists: false } },
            { 'producers.producerId': null },
            { producers: { $exists: false } },
            { producers: { $size: 0 } },
          ],
        },
        {
          createdAt: {
            $gte: new Date('2026-02-01T00:00:00.000Z'),
            $lte: new Date('2026-02-10T00:00:00.000Z'),
          },
        },
        {
          published: { $ne: false },
        },
        {
          baseProductId: { $exists: true, $nin: [null, ''] },
        },
        {
          $or: [
            { baseProductId: { $exists: true, $nin: [null, ''] } },
            { id: { $in: ['product-1'] } },
            { _id: { $in: ['507f1f77bcf86cd799439011'] } },
          ],
        },
      ],
    });
  });

  it('compiles structured title term advanced filters against stored fields with name fallbacks', async () => {
    const filter = await buildAdvancedMongoWhere(
      JSON.stringify({
        type: 'group',
        id: 'title-root',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'title-size',
            field: 'titleSize',
            operator: 'eq',
            value: '4 cm',
          },
          {
            type: 'condition',
            id: 'title-material',
            field: 'titleMaterial',
            operator: 'notIn',
            value: ['Metal', 'Wood'],
          },
          {
            type: 'condition',
            id: 'title-theme',
            field: 'titleTheme',
            operator: 'isNotEmpty',
          },
        ],
      }),
      baseExportContext
    );

    expect(filter).toEqual({
      $and: [
        {
          $or: [
            { 'structuredTitle.size': '4 cm' },
            {
              name_en: {
                $regex: '^\\s*[^|]*\\s*\\|\\s*4\\s+cm\\s*\\|',
              },
            },
          ],
        },
        {
          $nor: [
            {
              $or: [
                { 'structuredTitle.material': { $in: ['Metal', 'Wood'] } },
                {
                  name_en: {
                    $regex:
                      '^\\s*[^|]*\\s*\\|\\s*[^|]*\\s*\\|\\s*Metal\\s*\\|',
                  },
                },
                {
                  name_en: {
                    $regex:
                      '^\\s*[^|]*\\s*\\|\\s*[^|]*\\s*\\|\\s*Wood\\s*\\|',
                  },
                },
              ],
            },
          ],
        },
        {
          $or: [
            { 'structuredTitle.theme': { $exists: true, $nin: [null, ''] } },
            {
              name_en: {
                $regex:
                  '^\\s*[^|]*\\s*\\|\\s*[^|]*\\s*\\|\\s*[^|]*\\s*\\|\\s*[^|]*\\s*\\|\\s*[^|]*\\S[^|]*\\s*$',
              },
            },
          ],
        },
      ],
    });
  });

  it('builds mongo where clauses for classic filters and advanced/base-export filters', async () => {
    const advancedFilter = JSON.stringify({
      type: 'group',
      id: 'advanced-root',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'sku-filter',
          field: 'sku',
          operator: 'eq',
          value: 'SKU-1',
        },
      ],
    });

    const filter = await buildMongoWhere({
      id: ' product-1 ',
      idMatchMode: 'partial',
      sku: 'SKU',
      search: 'needle',
      description: 'details',
      minPrice: 5,
      maxPrice: 9,
      stockValue: 3,
      stockOperator: 'gte',
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-01-31T00:00:00.000Z',
      catalogId: 'unassigned',
      categoryId: 'category-1',
      baseExported: false,
      advancedFilter,
    });

    expect(loadMongoBaseExportLookupContextMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(filter)).toContain('product-1');
    expect(JSON.stringify(filter)).toContain('SKU');
    expect(JSON.stringify(filter)).toContain('needle');
    expect(JSON.stringify(filter)).toContain('details');
    expect(JSON.stringify(filter)).toContain('category-1');
    expect(JSON.stringify(filter)).toContain('catalogs');
    expect(JSON.stringify(filter)).toContain('product-1');
    expect(JSON.stringify(filter)).toContain('SKU-1');
  });

  it('expands classic category filters to descendant category ids', async () => {
    categoryFindOneMock.mockResolvedValue({
      _id: 'cat-pins',
      catalogId: 'catalog-1',
    });
    categoryToArrayMock.mockResolvedValue([
      { _id: 'cat-pins', parentId: null, catalogId: 'catalog-1' },
      { _id: 'cat-anime-pins', parentId: 'cat-pins', catalogId: 'catalog-1' },
      { _id: 'cat-game-pins', parentId: 'cat-pins', catalogId: 'catalog-1' },
      { _id: 'cat-naruto-pins', parentId: 'cat-anime-pins', catalogId: 'catalog-1' },
      { _id: 'cat-keychains', parentId: null, catalogId: 'catalog-1' },
    ]);

    const filter = await buildMongoWhere({
      categoryId: 'cat-pins',
    });

    expect(categoryFindOneMock).toHaveBeenCalledWith(
      { _id: { $in: ['cat-pins'] } },
      { projection: { _id: 1, catalogId: 1 } }
    );
    expect(categoryFindMock).toHaveBeenCalledWith(
      { catalogId: 'catalog-1' },
      { projection: { _id: 1, parentId: 1, catalogId: 1 } }
    );
    expect(filter).toEqual({
      categoryId: {
        $in: ['cat-pins', 'cat-anime-pins', 'cat-game-pins', 'cat-naruto-pins'],
      },
    });
  });

  it('filters classic category queries for unassigned products without category lookups', async () => {
    const filter = await buildMongoWhere({
      categoryId: PRODUCT_CATEGORY_FILTER_UNASSIGNED_VALUE,
    });

    expect(categoryFindOneMock).not.toHaveBeenCalled();
    expect(categoryFindMock).not.toHaveBeenCalled();
    expect(filter).toEqual({
      $or: [{ categoryId: { $exists: false } }, { categoryId: null }, { categoryId: '' }],
    });
  });

  it('compiles advanced category not equal Unassigned as assigned category filter', async () => {
    const filter = await buildAdvancedMongoWhere(
      JSON.stringify({
        type: 'group',
        id: 'root',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'category-assigned',
            field: 'categoryId',
            operator: 'neq',
            value: PRODUCT_CATEGORY_FILTER_UNASSIGNED_VALUE,
          },
        ],
      }),
      baseExportContext
    );

    expect(categoryFindOneMock).not.toHaveBeenCalled();
    expect(categoryFindMock).not.toHaveBeenCalled();
    expect(filter).toEqual({
      categoryId: { $exists: true, $nin: [null, ''] },
    });
  });

  it('compiles advanced category contains Unassigned as unassigned category filter', async () => {
    const filter = await buildAdvancedMongoWhere(
      JSON.stringify({
        type: 'group',
        id: 'root',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'category-unassigned',
            field: 'categoryId',
            operator: 'contains',
            value: PRODUCT_CATEGORY_FILTER_UNASSIGNED_VALUE,
          },
        ],
      }),
      baseExportContext
    );

    expect(categoryFindOneMock).not.toHaveBeenCalled();
    expect(categoryFindMock).not.toHaveBeenCalled();
    expect(filter).toEqual({
      $or: [{ categoryId: { $exists: false } }, { categoryId: null }, { categoryId: '' }],
    });
  });

  it('expands advanced category equality filters to descendant category ids', async () => {
    categoryFindOneMock.mockResolvedValue({
      _id: 'cat-pins',
      catalogId: 'catalog-1',
    });
    categoryToArrayMock.mockResolvedValue([
      { _id: 'cat-pins', parentId: null, catalogId: 'catalog-1' },
      { _id: 'cat-anime-pins', parentId: 'cat-pins', catalogId: 'catalog-1' },
      { _id: 'cat-game-pins', parentId: 'cat-pins', catalogId: 'catalog-1' },
    ]);

    const filter = await buildAdvancedMongoWhere(
      JSON.stringify({
        type: 'group',
        id: 'root',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'category-parent',
            field: 'categoryId',
            operator: 'eq',
            value: 'cat-pins',
          },
        ],
      }),
      baseExportContext
    );

    expect(filter).toEqual({
      categoryId: {
        $in: ['cat-pins', 'cat-anime-pins', 'cat-game-pins'],
      },
    });
  });

  it('compiles advanced Tradera status filters from resolved listing badge statuses', async () => {
    listingToArrayMock.mockResolvedValue([
      {
        productId: 'product-active',
        integrationId: 'integration-tradera',
        status: 'active',
        updatedAt: '2026-04-02T18:00:00.000Z',
      },
      {
        productId: 'product-active',
        integrationId: 'integration-tradera',
        status: 'auth_required',
        updatedAt: '2026-04-02T18:10:00.000Z',
      },
      {
        productId: 'product-closed',
        integrationId: 'integration-tradera',
        status: 'active',
        updatedAt: '2026-04-02T18:00:00.000Z',
      },
      {
        productId: 'product-closed',
        integrationId: 'integration-tradera',
        status: 'closed',
        updatedAt: '2026-04-02T18:10:00.000Z',
      },
    ]);

    const activeFilter = await buildAdvancedMongoWhere(
      JSON.stringify({
        type: 'group',
        id: 'root',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'tradera-active',
            field: 'traderaStatus',
            operator: 'eq',
            value: 'active',
          },
        ],
      }),
      baseExportContext
    );
    const closedFilter = await buildAdvancedMongoWhere(
      JSON.stringify({
        type: 'group',
        id: 'root',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'tradera-closed',
            field: 'traderaStatus',
            operator: 'eq',
            value: 'closed',
          },
        ],
      }),
      baseExportContext
    );

    expect(activeFilter).toEqual({
      $or: [
        { id: { $in: ['product-active'] } },
        { _id: { $in: ['product-active'] } },
      ],
    });
    expect(closedFilter).toEqual({
      $or: [
        { id: { $in: ['product-closed'] } },
        { _id: { $in: ['product-closed'] } },
      ],
    });
    expect(integrationFindMock).toHaveBeenCalledWith(
      { slug: { $in: ['tradera'] } },
      { projection: { _id: 1 } }
    );
    expect(listingFindMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { integrationId: { $in: ['integration-tradera'] } },
        ]),
      }),
      expect.objectContaining({
        projection: expect.objectContaining({
          productId: 1,
          status: 1,
        }),
      })
    );
  });

  it('compiles advanced Tradera not-added filters as products without listings or disabled status', async () => {
    listingToArrayMock.mockResolvedValue([
      {
        productId: 'product-listed',
        integrationId: 'integration-tradera',
        status: 'active',
        updatedAt: '2026-04-02T18:00:00.000Z',
      },
    ]);
    customFieldToArrayMock.mockResolvedValue([
      {
        _id: 'field-market',
        name: 'Market Exclusion',
        type: 'checkbox_set',
        options: [{ id: 'opt-tradera', label: 'Tradera' }],
      },
    ]);

    const filter = await buildAdvancedMongoWhere(
      JSON.stringify({
        type: 'group',
        id: 'root',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'tradera-not-added',
            field: 'traderaStatus',
            operator: 'eq',
            value: 'not_added',
          },
        ],
      }),
      baseExportContext
    );

    expect(filter).toEqual({
      $and: [
        {
          $and: [
            { id: { $nin: ['product-listed'] } },
            { _id: { $nin: ['product-listed'] } },
          ],
        },
        {
          $nor: [
            {
              customFields: {
                $elemMatch: {
                  fieldId: {
                    $in: ['market-exclusion', 'base-market-exclusion', 'field-market'],
                  },
                  selectedOptionIds: {
                    $in: ['tradera', 'market-exclusion-tradera', 'opt-tradera'],
                  },
                },
              },
            },
          ],
        },
      ],
    });
  });

  it('compiles advanced Tradera disabled filters from Market Exclusion custom fields', async () => {
    customFieldToArrayMock.mockResolvedValue([
      {
        _id: 'field-market',
        name: 'Market Exclusion',
        type: 'checkbox_set',
        options: [{ id: 'opt-tradera', label: 'Tradera' }],
      },
    ]);

    const filter = await buildAdvancedMongoWhere(
      JSON.stringify({
        type: 'group',
        id: 'root',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'tradera-disabled',
            field: 'traderaStatus',
            operator: 'eq',
            value: 'disabled',
          },
        ],
      }),
      baseExportContext
    );

    expect(filter).toEqual({
      customFields: {
        $elemMatch: {
          fieldId: {
            $in: ['market-exclusion', 'base-market-exclusion', 'field-market'],
          },
          selectedOptionIds: {
            $in: ['tradera', 'market-exclusion-tradera', 'opt-tradera'],
          },
        },
      },
    });
  });

  it('builds classic mongo where clauses for exact ids, language-scoped search, stock equality, and assigned catalogs', async () => {
    const filter = await buildMongoWhere({
      id: 'product-2',
      idMatchMode: 'exact',
      search: 'szukaj',
      searchLanguage: 'name_pl',
      stockValue: 4,
      stockOperator: 'eq',
      catalogId: 'catalog-2',
      baseExported: true,
    });

    expect(loadMongoBaseExportLookupContextMock).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(filter);
    expect(serialized).toContain('"id":"product-2"');
    expect(serialized).toContain('"_id":"product-2"');
    expect(serialized).toContain('"name_pl":{"$regex":"szukaj","$options":"i"}');
    expect(serialized).toContain('"stock":4');
    expect(serialized).toContain('"catalogs.catalogId":"catalog-2"');
    expect(serialized).toContain('"baseProductId":{"$exists":true,"$nin":[null,""]}');
    expect(serialized).toContain('"$in":["product-1"]');
  });

  it('builds mongo where clauses for a product id set', async () => {
    const filter = await buildMongoWhere({
      ids: ['product-1', 'product-2', 'product-1'],
    });

    expect(filter).toEqual({
      $or: [
        { id: { $in: ['product-1', 'product-2'] } },
        { _id: { $in: ['product-1', 'product-2'] } },
      ],
    });
  });

  it('filters archived products explicitly when the archived flag is provided', async () => {
    const archivedFalseFilter = await buildMongoWhere({
      archived: false,
    });
    const archivedTrueFilter = await buildMongoWhere({
      archived: true,
    });

    expect(archivedFalseFilter).toEqual({
      archived: { $ne: true },
    });
    expect(archivedTrueFilter).toEqual({
      archived: true,
    });
  });

  it('compiles the remaining string, id, and empty-state advanced operators', async () => {
    const payload = JSON.stringify({
      type: 'group',
      id: 'root-string-rest',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'id-empty',
          field: 'id',
          operator: 'isEmpty',
        },
        {
          type: 'condition',
          id: 'sku-neq',
          field: 'sku',
          operator: 'neq',
          value: 'SKU-2',
        },
        {
          type: 'condition',
          id: 'name-empty',
          field: 'name',
          operator: 'isEmpty',
        },
        {
          type: 'condition',
          id: 'name-eq',
          field: 'name',
          operator: 'eq',
          value: 'Alpha',
        },
        {
          type: 'condition',
          id: 'description-neq',
          field: 'description',
          operator: 'neq',
          value: 'desc-x',
        },
        {
          type: 'condition',
          id: 'base-product-empty',
          field: 'baseProductId',
          operator: 'isEmpty',
        },
      ],
    });

    const result = await buildAdvancedMongoWhere(payload, baseExportContext);

    expect(result).toMatchObject({
      $and: [
        {
          $or: [{ id: { $exists: false } }, { id: null }, { id: '' }],
        },
        {
          $nor: [{ sku: 'SKU-2' }],
        },
        {
          $and: [
            { $or: [{ name_en: { $exists: false } }, { name_en: null }, { name_en: '' }] },
            { $or: [{ name_pl: { $exists: false } }, { name_pl: null }, { name_pl: '' }] },
            { $or: [{ name_de: { $exists: false } }, { name_de: null }, { name_de: '' }] },
          ],
        },
        {
          $or: [
            { name_en: 'Alpha' },
            { name_pl: 'Alpha' },
            { name_de: 'Alpha' },
          ],
        },
        {
          $nor: [
            {
              $or: [
                { description_en: 'desc-x' },
                { description_pl: 'desc-x' },
                { description_de: 'desc-x' },
              ],
            },
          ],
        },
        {
          $or: [
            { baseProductId: { $exists: false } },
            { baseProductId: null },
            { baseProductId: '' },
          ],
        },
      ],
    });
  });

  it('compiles the remaining nested-id, numeric, date, boolean, and base-export operators', async () => {
    const payload = JSON.stringify({
      type: 'group',
      id: 'root-numeric-rest',
      combinator: 'and',
      not: false,
      rules: [
        {
          type: 'condition',
          id: 'catalog-eq',
          field: 'catalogId',
          operator: 'eq',
          value: 'catalog-1',
        },
        {
          type: 'condition',
          id: 'catalog-neq',
          field: 'catalogId',
          operator: 'neq',
          value: 'catalog-2',
        },
        {
          type: 'condition',
          id: 'tag-eq',
          field: 'tagId',
          operator: 'eq',
          value: 'tag-1',
        },
        {
          type: 'condition',
          id: 'producer-not-empty',
          field: 'producerId',
          operator: 'isNotEmpty',
        },
        {
          type: 'condition',
          id: 'price-gt',
          field: 'price',
          operator: 'gt',
          value: 5,
        },
        {
          type: 'condition',
          id: 'price-lte',
          field: 'price',
          operator: 'lte',
          value: 12,
        },
        {
          type: 'condition',
          id: 'stock-neq',
          field: 'stock',
          operator: 'neq',
          value: 0,
        },
        {
          type: 'condition',
          id: 'stock-not-empty',
          field: 'stock',
          operator: 'isNotEmpty',
        },
        {
          type: 'condition',
          id: 'created-eq',
          field: 'createdAt',
          operator: 'eq',
          value: '2026-03-01T00:00:00.000Z',
        },
        {
          type: 'condition',
          id: 'created-neq',
          field: 'createdAt',
          operator: 'neq',
          value: '2026-03-02T00:00:00.000Z',
        },
        {
          type: 'condition',
          id: 'created-lt',
          field: 'createdAt',
          operator: 'lt',
          value: '2026-03-03T00:00:00.000Z',
        },
        {
          type: 'condition',
          id: 'created-lte',
          field: 'createdAt',
          operator: 'lte',
          value: '2026-03-04T00:00:00.000Z',
        },
        {
          type: 'condition',
          id: 'created-empty',
          field: 'createdAt',
          operator: 'isEmpty',
        },
        {
          type: 'condition',
          id: 'published-false',
          field: 'published',
          operator: 'eq',
          value: false,
        },
        {
          type: 'condition',
          id: 'base-exported-false',
          field: 'baseExported',
          operator: 'eq',
          value: false,
        },
      ],
    });

    const result = await buildAdvancedMongoWhere(payload, baseExportContext);

    expect(result).toMatchObject({
      $and: [
        { 'catalogs.catalogId': 'catalog-1' },
        { 'catalogs.catalogId': { $ne: 'catalog-2' } },
        { 'tags.tagId': 'tag-1' },
        {
          $or: [
            { 'producers.producerId': { $exists: true, $nin: [null, ''] } },
            { 'producers.0': { $exists: true } },
          ],
        },
        { price: { $gt: 5 } },
        { price: { $lte: 12 } },
        { stock: { $nin: [0, '0', null], $exists: true } },
        { stock: { $exists: true, $ne: null } },
        { createdAt: new Date('2026-03-01T00:00:00.000Z') },
        { createdAt: { $ne: new Date('2026-03-02T00:00:00.000Z') } },
        { createdAt: { $lt: new Date('2026-03-03T00:00:00.000Z') } },
        { createdAt: { $lte: new Date('2026-03-04T00:00:00.000Z') } },
        { id: '__invalid_createdAt_empty__' },
        { published: false },
        {
          $and: [
            {
              $or: [
                { baseProductId: { $exists: false } },
                { baseProductId: null },
                { baseProductId: '' },
              ],
            },
            { id: { $nin: ['product-1'] } },
            { _id: { $nin: ['507f1f77bcf86cd799439011'] } },
          ],
        },
      ],
    });
  });

  it('returns null when advanced rules collapse to nothing and skips export lookup for classic-only filters', async () => {
    const advancedNull = await buildAdvancedMongoWhere(
      JSON.stringify({
        type: 'group',
        id: 'null-root',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'created-not-empty',
            field: 'createdAt',
            operator: 'isNotEmpty',
          },
        ],
      }),
      baseExportContext
    );

    expect(advancedNull).toBeNull();

    const filter = await buildMongoWhere({
      sku: 'SKU',
      search: 'needle',
      description: 'details',
      minPrice: 1,
      stockValue: 2,
      stockOperator: 'lt',
      endDate: '2026-02-01T00:00:00.000Z',
      categoryId: 'category-9',
    });

    expect(loadMongoBaseExportLookupContextMock).not.toHaveBeenCalled();
    const serialized = JSON.stringify(filter);
    expect(serialized).toContain('"sku":{"$regex":"SKU","$options":"i"}');
    expect(serialized).toContain('"stock":{"$lt":2,"$type":"number"}');
    expect(serialized).toContain('"createdAt":{"$lte":"2026-02-01T00:00:00.000Z"}');
    expect(serialized).toContain('"categoryId":"category-9"');
  });
});
