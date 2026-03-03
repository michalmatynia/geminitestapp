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

  it('rejects legacy category relation fallback when categoryId is missing', () => {
    expect(() =>
      toProductResponse({
        _id: 'product-3',
        id: 'product-3',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        categories: [{ categoryId: 'category-legacy' }],
        catalogId: 'catalog-1',
        published: false,
      } as unknown as WithId<ProductDocument>)
    ).toThrowError(/Legacy product category document shape is no longer supported/);
  });
});
