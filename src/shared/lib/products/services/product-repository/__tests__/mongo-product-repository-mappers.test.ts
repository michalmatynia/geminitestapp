import { describe, expect, it } from 'vitest';
import type { WithId } from 'mongodb';

import { toProductResponse, type ProductDocument } from '../mongo-product-repository-mappers';

const asProductDocument = (doc: Record<string, unknown>): WithId<ProductDocument> =>
  doc as WithId<ProductDocument>;

describe('mongo product repository mappers', () => {
  it('maps canonical scalar localized fields', () => {
    const result = toProductResponse(asProductDocument({
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
    }));

    expect(result.name['en']).toBe('new name');
    expect(result.name['pl']).toBeNull();
    expect(result.name['de']).toBe('new de');
    expect(result.description['en']).toBe('new description');
    expect(result.description['pl']).toBe('new pl');
    expect(result.description['de']).toBeNull();
    expect(result.categoryId).toBe('category-1');
  });

  it('normalizes duplicate parameter entries by merging sibling localized values', () => {
    const result = toProductResponse(asProductDocument({
      _id: 'product-params-1',
      id: 'product-params-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      catalogId: 'catalog-1',
      published: false,
      parameters: [
        {
          parameterId: 'condition',
          value: 'Nowy',
          valuesByLanguage: { en: 'Nowy' },
        },
        {
          parameterId: 'condition',
          value: '',
          valuesByLanguage: { pl: 'Uzywany' },
        },
      ],
    }));

    expect(result.parameters).toEqual([
      {
        parameterId: 'condition',
        value: 'Nowy',
        valuesByLanguage: { en: 'Nowy', pl: 'Uzywany' },
      },
    ]);
  });

  it('normalizes duplicate parameter entries and keeps explicitly cleared parameters blank', () => {
    const result = toProductResponse(asProductDocument({
      _id: 'product-params-2',
      id: 'product-params-2',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      catalogId: 'catalog-1',
      published: false,
      parameters: [
        {
          parameterId: 'name',
          value: 'Nowy',
          valuesByLanguage: { en: 'Nowy' },
        },
        {
          parameterId: 'name',
          value: '',
        },
      ],
    }));

    expect(result.parameters).toEqual([
      {
        parameterId: 'name',
        value: '',
      },
    ]);
  });

  it('rejects legacy nested localized objects', () => {
    expect(() =>
      toProductResponse(asProductDocument({
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
      }))
    ).toThrowError(/Product description payload includes unsupported object shape\./);
  });

  it('rejects legacy category relation fallback when categoryId is missing', () => {
    expect(() =>
      toProductResponse(asProductDocument({
        _id: 'product-3',
        id: 'product-3',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        categories: [{ categoryId: 'category-legacy' }],
        catalogId: 'catalog-1',
        published: false,
      }))
    ).toThrowError(/Product categories payload includes unsupported fields\./);
  });

  it('rejects legacy category relation field even when categoryId is present', () => {
    expect(() =>
      toProductResponse(asProductDocument({
        _id: 'product-3b',
        id: 'product-3b',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        categoryId: 'category-canonical',
        categories: [{ categoryId: 'category-legacy' }],
        catalogId: 'catalog-1',
        published: false,
      }))
    ).toThrowError(/Product categories payload includes unsupported fields\./);
  });

  it('rejects non-string categoryId payloads', () => {
    expect(() =>
      toProductResponse(asProductDocument({
        _id: 'product-3c',
        id: 'product-3c',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        categoryId: 123,
        catalogId: 'catalog-1',
        published: false,
      }))
    ).toThrowError(/Invalid product categoryId payload/);
  });

  it('rejects non-string localized scalar payloads', () => {
    expect(() =>
      toProductResponse(asProductDocument({
        _id: 'product-3d',
        id: 'product-3d',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        name_en: 42,
        categoryId: 'category-1',
        catalogId: 'catalog-1',
        published: false,
      }))
    ).toThrowError(/Invalid product localized scalar field payload/);
  });

  it('rejects legacy producer relation keys instead of reconstructing producer relations', () => {
    expect(() =>
      toProductResponse(asProductDocument({
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
      }))
    ).toThrowError(/Product producer relation payload includes unsupported fields\./);
  });

  it('rejects legacy tag relation keys instead of reconstructing tag relations', () => {
    expect(() =>
      toProductResponse(asProductDocument({
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
      }))
    ).toThrowError(/Product tag relation payload includes unsupported fields\./);
  });

  it('rejects producer relations missing canonical required fields', () => {
    expect(() =>
      toProductResponse(asProductDocument({
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
      }))
    ).toThrowError(/Invalid product producer relation payload/);
  });
});
