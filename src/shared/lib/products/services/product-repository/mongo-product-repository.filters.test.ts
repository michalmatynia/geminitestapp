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
});
