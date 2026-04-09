import { describe, expect, it } from 'vitest';
import type { WithId } from 'mongodb';

import {
  toProductBase,
  toProductResponse,
  type ProductDocument,
} from './mongo-product-repository-mappers';

const asProductDocument = (doc: Record<string, unknown>): WithId<ProductDocument> =>
  doc as WithId<ProductDocument>;

describe('mongo product repository mappers shared-lib coverage', () => {
  it('maps canonical localized fields, catalog relations, and merged parameters', () => {
    const result = toProductResponse(
      asProductDocument({
        _id: 'product-1',
        id: 'product-1',
        importSource: 'base',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        name_en: 'Name EN',
        name_pl: null,
        name_de: 'Name DE',
        description_en: 'Desc EN',
        description_pl: 'Desc PL',
        description_de: null,
        catalogId: 'default',
        catalogs: [
          {
            productId: 'product-1',
            catalogId: 'catalog-mentios',
            assignedAt: '2026-01-02T00:00:00.000Z',
            catalog: { id: 'catalog-mentios' },
          },
        ],
        categoryId: 'category-1',
        published: true,
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
      })
    );

    expect(result.name).toEqual({ en: 'Name EN', pl: null, de: 'Name DE' });
    expect(result.description).toEqual({ en: 'Desc EN', pl: 'Desc PL', de: null });
    expect(result.importSource).toBe('base');
    expect(result.catalogId).toBe('catalog-mentios');
    expect(result.categoryId).toBe('category-1');
    expect(result.parameters).toEqual([
      {
        parameterId: 'condition',
        value: 'Nowy',
        valuesByLanguage: { en: 'Nowy', pl: 'Uzywany' },
      },
    ]);
  });

  it('preserves a normalized embedded category on both response and base mappers', () => {
    const doc = asProductDocument({
      _id: 'product-category-1',
      id: 'product-category-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      catalogId: 'catalog-1',
      published: true,
      categoryId: 'category-1',
      category: {
        id: 'category-1',
        name_en: 'Keychains',
        catalogId: 'catalog-1',
        color: null,
        parentId: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    });

    const response = toProductResponse(doc);
    const base = toProductBase(doc);

    expect(response.category).toEqual({
      id: 'category-1',
      name: 'Keychains',
      name_en: 'Keychains',
      catalogId: 'catalog-1',
      color: null,
      parentId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    expect(base.category).toEqual(response.category);
  });

  it('maps canonical tags, producers, note ids, and default images through toProductBase', () => {
    const result = toProductBase({
      _id: 'product-base-1',
      id: 'product-base-1',
      importSource: 'base',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      catalogId: 'catalog-1',
      published: true,
      noteIds: ['note-1', 'note-2'],
      tags: [
        {
          tagId: 'tag-1',
          productId: 'product-base-1',
          assignedAt: '2026-01-02T00:00:00.000Z',
          tag: { id: 'tag-1', name: 'Featured' },
        },
      ],
      producers: [
        {
          producerId: 'producer-1',
          productId: 'product-base-1',
          assignedAt: '2026-01-02T00:00:00.000Z',
          producer: { id: 'producer-1', name: 'Acme' },
        },
      ],
    } as ProductDocument);

    expect(result.noteIds).toEqual(['note-1', 'note-2']);
    expect(result.importSource).toBe('base');
    expect(result.images).toEqual([]);
    expect(result.tags).toEqual([
      {
        tagId: 'tag-1',
        productId: 'product-base-1',
        assignedAt: '2026-01-02T00:00:00.000Z',
        tag: { id: 'tag-1', name: 'Featured' },
      },
    ]);
    expect(result.producers).toEqual([
      {
        producerId: 'producer-1',
        productId: 'product-base-1',
        assignedAt: '2026-01-02T00:00:00.000Z',
        producer: { id: 'producer-1', name: 'Acme' },
      },
    ]);
  });

  it('normalizes marketplace content overrides on response and base product mappings', () => {
    const doc = asProductDocument({
      _id: 'product-copy-1',
      id: 'product-copy-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      catalogId: 'catalog-1',
      published: true,
      marketplaceContentOverrides: [
        {
          integrationIds: [' integration-tradera ', 'integration-vinted'],
          title: ' Alternate title ',
          description: ' Alternate description ',
        },
        {
          integrationIds: [],
          title: null,
          description: null,
        },
      ],
    });

    expect(toProductResponse(doc).marketplaceContentOverrides).toEqual([
      {
        integrationIds: ['integration-tradera', 'integration-vinted'],
        title: 'Alternate title',
        description: 'Alternate description',
      },
    ]);
    expect(toProductBase(doc).marketplaceContentOverrides).toEqual([
      {
        integrationIds: ['integration-tradera', 'integration-vinted'],
        title: 'Alternate title',
        description: 'Alternate description',
      },
    ]);
  });

  it('reconstructs legacy producer references in both response and base mappers', () => {
    const response = toProductResponse(
      asProductDocument({
        _id: 'product-legacy-producer',
        id: 'product-legacy-producer',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
        catalogId: 'catalog-1',
        published: false,
        producerIds: ['producer-1', 'producer-1'],
      })
    );
    const base = toProductBase({
      _id: 'product-base-legacy',
      id: 'product-base-legacy',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      catalogId: 'catalog-1',
      published: false,
      manufacturerId: 42,
    } as ProductDocument);

    expect(response.producers).toEqual([
      {
        productId: 'product-legacy-producer',
        producerId: 'producer-1',
        assignedAt: '2026-01-03T00:00:00.000Z',
      },
    ]);
    expect(base.producers).toEqual([
      {
        productId: 'product-base-legacy',
        producerId: '42',
        assignedAt: '2026-01-03T00:00:00.000Z',
      },
    ]);
  });

  it('rejects unsupported legacy localized and category payloads', () => {
    expect(() =>
      toProductResponse(
        asProductDocument({
          _id: 'legacy-description',
          id: 'legacy-description',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          description: { en: 'legacy', pl: 'legacy-pl', de: null },
          catalogId: 'catalog-1',
          published: false,
        })
      )
    ).toThrowError(/Product description payload includes unsupported object shape\./);

    expect(() =>
      toProductResponse(
        asProductDocument({
          _id: 'legacy-categories',
          id: 'legacy-categories',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          categories: [{ categoryId: 'category-legacy' }],
          catalogId: 'catalog-1',
          published: false,
        })
      )
    ).toThrowError(/Product categories payload includes unsupported fields\./);

    expect(() =>
      toProductResponse(
        asProductDocument({
          _id: 'invalid-name-type',
          id: 'invalid-name-type',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          name_en: 42,
          categoryId: 'category-1',
          catalogId: 'catalog-1',
          published: false,
        })
      )
    ).toThrowError(/Invalid product localized scalar field payload/);
  });

  it('rejects malformed producer payloads', () => {
    expect(() =>
      toProductResponse(
        asProductDocument({
          _id: 'producer-unsupported-keys',
          id: 'producer-unsupported-keys',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          catalogId: 'catalog-1',
          published: false,
          producers: [
            {
              producer_id: 'producer-1',
              product_id: 'producer-unsupported-keys',
              assigned_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        })
      )
    ).toThrowError(/Product producer relation payload includes unsupported fields\./);

    expect(() =>
      toProductResponse(
        asProductDocument({
          _id: 'producer-missing-fields',
          id: 'producer-missing-fields',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          catalogId: 'catalog-1',
          published: false,
          producers: [{ producerId: 'producer-1' }],
        })
      )
    ).toThrowError(/Invalid product producer relation payload/);

    expect(() =>
      toProductBase({
        _id: 'producer-not-array',
        id: 'producer-not-array',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        catalogId: 'catalog-1',
        published: false,
        producers: 'producer-1',
      } as ProductDocument)
    ).toThrowError(/Invalid product producer relations payload\./);
  });

  it('rejects malformed tag payloads', () => {
    expect(() =>
      toProductResponse(
        asProductDocument({
          _id: 'tag-unsupported-keys',
          id: 'tag-unsupported-keys',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          catalogId: 'catalog-1',
          published: false,
          tags: [
            {
              tag_id: 'tag-1',
              product_id: 'tag-unsupported-keys',
              assigned_at: '2026-01-01T00:00:00.000Z',
            },
          ],
        })
      )
    ).toThrowError(/Product tag relation payload includes unsupported fields\./);

    expect(() =>
      toProductResponse(
        asProductDocument({
          _id: 'tag-not-array',
          id: 'tag-not-array',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          catalogId: 'catalog-1',
          published: false,
          tags: 'tag-1',
        })
      )
    ).toThrowError(/Invalid product tag relations payload\./);

    expect(() =>
      toProductResponse(
        asProductDocument({
          _id: 'tag-entry-not-object',
          id: 'tag-entry-not-object',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          catalogId: 'catalog-1',
          published: false,
          tags: [null],
        })
      )
    ).toThrowError(/Invalid product tag relation entry payload\./);

    expect(() =>
      toProductResponse(
        asProductDocument({
          _id: 'tag-missing-fields',
          id: 'tag-missing-fields',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z'),
          catalogId: 'catalog-1',
          published: false,
          tags: [{ tagId: 'tag-1' }],
        })
      )
    ).toThrowError(/Invalid product tag relation payload\./);
  });
});
