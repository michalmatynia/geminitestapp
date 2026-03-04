import { describe, expect, it } from 'vitest';
import type { WithId } from 'mongodb';

import { toProductResponse, type ProductDocument } from '../mongo-product-repository-mappers';

describe('mongo product repository mappers', () => {
  it('maps canonical scalar localized fields', () => {
    const result = toProductResponse({
      _id: 'product-1',
      id: 'product-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      name_en: 'new name',
      name_pl: null,
      name_de: 'new de',
      description_en: 'new description',
      description_pl: 'new pl',
      description_de: null,
      categoryId: 'category-1',
      catalogId: 'catalog-1',
      published: false,
    } as unknown as WithId<ProductDocument>);

    expect(result.name['en']).toBe('new name');
    expect(result.name['pl']).toBeNull();
    expect(result.name['de']).toBe('new de');
    expect(result.description['en']).toBe('new description');
    expect(result.description['pl']).toBe('new pl');
    expect(result.description['de']).toBeNull();
    expect(result.categoryId).toBe('category-1');
  });

  it('rejects legacy nested localized objects', () => {
    expect(() =>
      toProductResponse({
        _id: 'product-2',
        id: 'product-2',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        description: { en: 'legacy description', pl: 'legacy-pl', de: null },
        description_en: null,
        description_pl: undefined,
        description_de: undefined,
        catalogId: 'catalog-1',
        published: false,
      } as unknown as WithId<ProductDocument>)
    ).toThrowError(/Legacy product description document shape is no longer supported/);
  });

  it('maps legacy category relation fallback when categoryId is missing', () => {
    const result = toProductResponse({
      _id: 'product-3',
      id: 'product-3',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      categories: [{ categoryId: 'category-legacy' }],
      catalogId: 'catalog-1',
      published: false,
    } as unknown as WithId<ProductDocument>);

    expect(result.categoryId).toBe('category-legacy');
  });

  it('prefers canonical categoryId when both canonical and legacy relation fields are present', () => {
    const result = toProductResponse({
      _id: 'product-3b',
      id: 'product-3b',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      categoryId: 'category-canonical',
      categories: [{ categoryId: 'category-legacy' }],
      catalogId: 'catalog-1',
      published: false,
    } as unknown as WithId<ProductDocument>);

    expect(result.categoryId).toBe('category-canonical');
  });

  it('maps single-object legacy category relation shapes', () => {
    const result = toProductResponse({
      _id: 'product-3c',
      id: 'product-3c',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      categories: { category_id: 'legacy-snake-case' },
      catalogId: 'catalog-1',
      published: false,
    } as unknown as WithId<ProductDocument>);

    expect(result.categoryId).toBe('legacy-snake-case');
  });

  it('rejects non-string categoryId payloads', () => {
    expect(() =>
      toProductResponse({
        _id: 'product-3d',
        id: 'product-3d',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        categoryId: 123,
        catalogId: 'catalog-1',
        published: false,
      } as unknown as WithId<ProductDocument>)
    ).toThrowError(/Invalid product categoryId payload/);
  });

  it('rejects non-string localized scalar payloads', () => {
    expect(() =>
      toProductResponse({
        _id: 'product-3e',
        id: 'product-3e',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        name_en: 42,
        categoryId: 'category-1',
        catalogId: 'catalog-1',
        published: false,
      } as unknown as WithId<ProductDocument>)
    ).toThrowError(/Invalid product localized scalar field payload/);
  });

  it('maps legacy producer relation keys', () => {
    const result = toProductResponse({
      _id: 'product-4',
      id: 'product-4',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      catalogId: 'catalog-1',
      published: false,
      producers: [
        {
          producer_id: 'producer-1',
          product_id: 'product-4',
          assigned_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    } as unknown as WithId<ProductDocument>);

    expect(result.producers).toHaveLength(1);
    expect(result.producers?.[0]).toMatchObject({
      producerId: 'producer-1',
      productId: 'product-4',
      assignedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('maps legacy tag relation keys', () => {
    const result = toProductResponse({
      _id: 'product-5',
      id: 'product-5',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      catalogId: 'catalog-1',
      published: false,
      tags: [
        {
          tag_id: 'tag-1',
          product_id: 'product-5',
          assigned_at: '2026-01-01T00:00:00.000Z',
        },
      ],
    } as unknown as WithId<ProductDocument>);

    expect(result.tags).toHaveLength(1);
    expect(result.tags?.[0]).toMatchObject({
      tagId: 'tag-1',
      productId: 'product-5',
      assignedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('skips malformed producer relations instead of throwing', () => {
    const result = toProductResponse({
      _id: 'product-6',
      id: 'product-6',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      catalogId: 'catalog-1',
      published: false,
      producers: [
        {
          producerId: 'producer-1',
        },
      ],
    } as unknown as WithId<ProductDocument>);

    expect(result.producers).toEqual([]);
  });
});
