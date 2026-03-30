import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadMongoBaseExportLookupContextMock, loggerInfoMock } = vi.hoisted(() => ({
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

  it('compiles advanced filters across string, numeric, nested-id, date, boolean, and not branches', () => {
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

    const result = buildAdvancedMongoWhere(payload, baseExportContext);

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

  it('returns null when the advanced filter payload is invalid', () => {
    expect(buildAdvancedMongoWhere('{bad-json', baseExportContext)).toBeNull();
    expect(loggerInfoMock).not.toHaveBeenCalled();
  });

  it('compiles additional advanced operators for ids, strings, nested ids, dates, booleans, and base-export state', () => {
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

    const result = buildAdvancedMongoWhere(payload, baseExportContext);

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

  it('compiles the remaining string, id, and empty-state advanced operators', () => {
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

    const result = buildAdvancedMongoWhere(payload, baseExportContext);

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

  it('compiles the remaining nested-id, numeric, date, boolean, and base-export operators', () => {
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

    const result = buildAdvancedMongoWhere(payload, baseExportContext);

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
        { stock: { $ne: 0 } },
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
    const advancedNull = buildAdvancedMongoWhere(
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
    expect(serialized).toContain('"stock":{"$lt":2}');
    expect(serialized).toContain('"createdAt":{"$lte":"2026-02-01T00:00:00.000Z"}');
    expect(serialized).toContain('"categoryId":"category-9"');
  });
});
