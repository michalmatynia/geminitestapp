import { describe, expect, it } from 'vitest';

import {
  applySchemaSelection,
  formatCollectionLabel,
  formatCollectionSchema,
  isProductCollection,
  matchesCollectionSelection,
  normalizeCollectionKey,
  normalizeSchemaCollections,
  normalizeSchemaType,
  pluralize,
  singularize,
  toDbSchemaSnapshot,
  toDbSchemaSnapshotCollection,
  toDbSchemaSnapshotSourceCollection,
  toSnakeCase,
  toTitleCase,
} from './database-node-utils';

describe('database-node-utils', () => {
  it('normalizes labels and singular/plural helper text', () => {
    expect(toTitleCase('product_categories')).toBe('Product Categories');
    expect(toTitleCase('  multi-word_value ')).toBe('Multi Word Value');

    expect(singularize('categories')).toBe('category');
    expect(singularize('classes')).toBe('class');
    expect(singularize('products')).toBe('product');
    expect(singularize('glass')).toBe('glass');

    expect(toSnakeCase('ProductCategory')).toBe('product_category');
    expect(toSnakeCase('multi word-value')).toBe('multi_word_value');

    expect(pluralize('category')).toBe('categories');
    expect(pluralize('box')).toBe('boxes');
    expect(pluralize('bus')).toBe('bus');
    expect(pluralize('')).toBe('');
  });

  it('maps known schema aliases and formats collection interfaces', () => {
    expect(normalizeSchemaType(' int ')).toBe('number');
    expect(normalizeSchemaType('BOOL')).toBe('boolean');
    expect(normalizeSchemaType('json')).toBe('Record<string, unknown>');
    expect(normalizeSchemaType('ObjectId')).toBe('ObjectId');
    expect(normalizeSchemaType('   ')).toBe('unknown');

    expect(formatCollectionSchema('products')).toBe('interface Product {}');
    expect(
      formatCollectionSchema('product_categories', [
        { name: 'title', type: 'string' },
        { name: 'price', type: 'decimal' },
      ])
    ).toBe('interface Product Category {\n  title: string;\n  price: number;\n}');
  });

  it('formats collection labels and normalizes single-provider schemas', () => {
    const collection = {
      name: 'product_categories',
      provider: 'mongodb',
      fields: [{ name: 'title', type: 'string' }],
    };

    expect(formatCollectionLabel(collection as never, true)).toBe('Product Categories (mongodb)');
    expect(formatCollectionLabel(collection as never, false)).toBe('Product Categories');

    expect(normalizeSchemaCollections(null)).toEqual([]);
    expect(
      normalizeSchemaCollections({
        provider: 'mongodb',
        collections: [{ name: 'products', fields: [] }],
      } as never)
    ).toEqual([
      {
        name: 'products',
        fields: [],
        provider: 'mongodb',
      },
    ]);
    expect(
      normalizeSchemaCollections({
        provider: 'postgres',
        collections: {
          categories: { name: 'categories', fields: [] },
        },
      } as never)
    ).toEqual([
      {
        name: 'categories',
        fields: [],
        provider: 'mongodb',
      },
    ]);
  });

  it('normalizes multi-provider schemas from explicit mongodb sources and fallback collections', () => {
    const multiWithSource = normalizeSchemaCollections({
      provider: 'multi',
      collections: [{ name: 'products', fields: [], provider: 'postgres' }],
      sources: {
        mongodb: {
          collections: [
            { name: 'mongo_products', fields: [], provider: 'mongodb' },
            { name: 'mongo_categories', fields: [], provider: undefined },
          ],
        },
      },
    } as never);
    expect(multiWithSource).toEqual([
      {
        name: 'mongo_products',
        fields: [],
        provider: 'mongodb',
      },
      {
        name: 'mongo_categories',
        fields: [],
      },
    ]);

    const multiFallback = normalizeSchemaCollections({
      provider: 'multi',
      collections: [
        { name: 'products', fields: [], provider: 'mongodb' },
        { name: 'categories', fields: [], provider: undefined },
        { name: 'orders', fields: [], provider: 'postgres' },
      ],
    } as never);
    expect(multiFallback).toEqual([
      {
        name: 'products',
        fields: [],
        provider: 'mongodb',
      },
      {
        name: 'categories',
        fields: [],
      },
    ]);
  });

  it('matches and filters schema selections with optional field stripping', () => {
    const schema = {
      provider: 'multi',
      collections: [
        {
          name: 'products',
          provider: 'mongodb',
          fields: [{ name: 'sku', type: 'string' }],
        },
        {
          name: 'orders',
          provider: 'mongodb',
          fields: [{ name: 'status', type: 'string' }],
        },
      ],
    };

    expect(
      matchesCollectionSelection(
        { name: 'products', provider: 'mongodb', fields: [] } as never,
        new Set(['products'])
      )
    ).toBe(true);
    expect(
      matchesCollectionSelection(
        { name: 'products', provider: 'mongodb', fields: [] } as never,
        new Set(['mongodb:products'])
      )
    ).toBe(true);
    expect(
      matchesCollectionSelection(
        { name: 'products', provider: 'mongodb', fields: [] } as never,
        new Set(['orders'])
      )
    ).toBe(false);

    expect(
      applySchemaSelection(schema as never, {
        mode: 'selected',
        collections: ['mongodb:orders'],
      })
    ).toEqual({
      ...schema,
      collections: [
        {
          name: 'orders',
          provider: 'mongodb',
          fields: [{ name: 'status', type: 'string' }],
        },
      ],
    });

    expect(
      applySchemaSelection(schema as never, {
        mode: 'all',
        includeFields: false,
      })
    ).toEqual({
      ...schema,
      collections: [
        { name: 'products', provider: 'mongodb', fields: [] },
        { name: 'orders', provider: 'mongodb', fields: [] },
      ],
    });
  });

  it('builds db schema snapshot collections and multi-provider snapshots', () => {
    const mongoCollection = {
      name: 'products',
      provider: 'mongodb',
      fields: [{ name: 'sku', type: 'string' }],
      relations: ['catalogs'],
    };
    const genericCollection = {
      name: 'orders',
      fields: [{ name: 'status', type: 'string' }],
    };

    expect(toDbSchemaSnapshotCollection(mongoCollection as never)).toEqual({
      name: 'products',
      provider: 'mongodb',
      fields: [{ name: 'sku', type: 'string' }],
      relations: ['catalogs'],
    });
    expect(toDbSchemaSnapshotCollection(genericCollection as never)).toEqual({
      name: 'orders',
      fields: [{ name: 'status', type: 'string' }],
    });
    expect(toDbSchemaSnapshotSourceCollection(mongoCollection as never)).toEqual({
      name: 'products',
      fields: [{ name: 'sku', type: 'string' }],
      relations: ['catalogs'],
    });

    expect(
      toDbSchemaSnapshot(
        {
          provider: 'multi',
          collections: [mongoCollection],
          sources: {
            mongodb: {
              collections: [mongoCollection],
            },
          },
        } as never,
        '2026-03-30T00:00:00.000Z'
      )
    ).toEqual({
      provider: 'multi',
      collections: [
        {
          name: 'products',
          provider: 'mongodb',
          fields: [{ name: 'sku', type: 'string' }],
          relations: ['catalogs'],
        },
      ],
      sources: {
        mongodb: {
          provider: 'mongodb',
          collections: [
            {
              name: 'products',
              fields: [{ name: 'sku', type: 'string' }],
              relations: ['catalogs'],
            },
          ],
        },
      },
      syncedAt: '2026-03-30T00:00:00.000Z',
    });

    expect(
      toDbSchemaSnapshot(
        {
          provider: 'postgres',
          collections: [genericCollection],
        } as never,
        '2026-03-30T00:00:00.000Z'
      )
    ).toEqual({
      provider: 'mongodb',
      collections: [
        {
          name: 'orders',
          fields: [{ name: 'status', type: 'string' }],
          provider: 'mongodb',
        },
      ],
      syncedAt: '2026-03-30T00:00:00.000Z',
    });
  });

  it('recognizes product collections across normalized name variants', () => {
    expect(normalizeCollectionKey(' Products ')).toBe('products');
    expect(isProductCollection('products')).toBe(true);
    expect(isProductCollection('ProductTags')).toBe(true);
    expect(isProductCollection('product-category')).toBe(true);
    expect(isProductCollection('catalog')).toBe(true);
    expect(isProductCollection('orders')).toBe(false);
    expect(isProductCollection('   ')).toBe(false);
    expect(isProductCollection('')).toBe(false);
  });
});
