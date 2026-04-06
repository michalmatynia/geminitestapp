import { describe, expect, it } from 'vitest';

import type { CategoryMappingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  resolveProductCatalogIds,
  selectPreferredTraderaCategoryMapping,
  selectPreferredTraderaCategoryMappingResolution,
} from './category-mapping';

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    baseProductId: 'BASE-1',
    importSource: null,
    defaultPriceGroupId: null,
    ean: null,
    gtin: null,
    asin: null,
    name: {},
    description: {},
    supplierName: null,
    supplierLink: null,
    priceComment: null,
    stock: 1,
    price: 10,
    sizeLength: null,
    sizeWidth: null,
    weight: null,
    length: null,
    published: false,
    categoryId: 'internal-category-1',
    catalogId: 'catalog-primary',
    catalogs: [{ productId: 'product-1', catalogId: 'catalog-primary', assignedAt: '2026-04-02T00:00:00.000Z', catalog: { id: 'catalog-primary', name: 'Primary', createdAt: '2026-04-02T00:00:00.000Z', updatedAt: '2026-04-02T00:00:00.000Z' } }],
    images: [],
    tags: [],
    producers: [],
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

const createMapping = (overrides: Partial<CategoryMappingWithDetails> = {}): CategoryMappingWithDetails =>
  ({
    id: 'mapping-1',
    connectionId: 'connection-1',
    externalCategoryId: '1001',
    internalCategoryId: 'internal-category-1',
    catalogId: 'catalog-primary',
    isActive: true,
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z',
    externalCategory: {
      id: 'external-category-1',
      connectionId: 'connection-1',
      externalId: '1001',
      name: 'Pins',
      parentExternalId: '1000',
      path: 'Collectibles > Pins',
      depth: 1,
      isLeaf: true,
      metadata: null,
      fetchedAt: '2026-04-02T00:00:00.000Z',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
    },
    internalCategory: {
      id: 'internal-category-1',
      name: 'Pins',
      description: null,
      color: null,
      parentId: null,
      catalogId: 'catalog-primary',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
    },
    ...overrides,
  }) as CategoryMappingWithDetails;

describe('resolveProductCatalogIds', () => {
  it('returns unique direct and attached product catalog ids', () => {
    const product = createProduct({
      catalogId: 'catalog-primary',
      catalogs: [
        { productId: 'product-1', catalogId: 'catalog-primary', assignedAt: '2026-04-02T00:00:00.000Z' },
        { productId: 'product-1', catalogId: 'catalog-secondary', assignedAt: '2026-04-02T00:00:00.000Z' },
      ],
    });

    expect(resolveProductCatalogIds(product)).toEqual(['catalog-primary', 'catalog-secondary']);
  });
});

describe('selectPreferredTraderaCategoryMapping', () => {
  it('prefers the mapping that matches the product catalog', () => {
    const result = selectPreferredTraderaCategoryMappingResolution({
      product: createProduct(),
      mappings: [
        createMapping({
          id: 'mapping-secondary',
          catalogId: 'catalog-secondary',
          externalCategoryId: '2001',
          externalCategory: {
            ...createMapping().externalCategory,
            externalId: '2001',
            path: 'Fallback > Secondary',
            name: 'Secondary',
          },
        }),
        createMapping(),
      ],
    });

    expect(result).toEqual({
      mapping: {
        externalCategoryId: '1001',
        externalCategoryName: 'Pins',
        externalCategoryPath: 'Collectibles > Pins',
        internalCategoryId: 'internal-category-1',
        catalogId: 'catalog-primary',
        pathSegments: ['Collectibles', 'Pins'],
      },
      reason: 'mapped',
      matchScope: 'catalog_match',
      internalCategoryId: 'internal-category-1',
      productCatalogIds: ['catalog-primary'],
      matchingMappingCount: 2,
      validMappingCount: 2,
      catalogMatchedMappingCount: 1,
    });
  });

  it('returns null when multiple active mapped categories remain after prioritization', () => {
    const result = selectPreferredTraderaCategoryMappingResolution({
      product: createProduct(),
      mappings: [
        createMapping(),
        createMapping({
          id: 'mapping-2',
          externalCategoryId: '1002',
          updatedAt: '2026-04-02T01:00:00.000Z',
          externalCategory: {
            ...createMapping().externalCategory,
            externalId: '1002',
            name: 'Keychains',
            path: 'Collectibles > Keychains',
          },
        }),
      ],
    });

    expect(result).toEqual({
      mapping: null,
      reason: 'ambiguous_external_category',
      matchScope: 'catalog_match',
      internalCategoryId: 'internal-category-1',
      productCatalogIds: ['catalog-primary'],
      matchingMappingCount: 2,
      validMappingCount: 2,
      catalogMatchedMappingCount: 2,
    });
  });

  it('flags stale external categories when only missing external placeholders remain', () => {
    const result = selectPreferredTraderaCategoryMappingResolution({
      product: createProduct(),
      mappings: [
        createMapping({
          externalCategory: {
            ...createMapping().externalCategory,
            name: '[Missing external category: Pins]',
          },
        }),
      ],
    });

    expect(result).toEqual({
      mapping: null,
      reason: 'stale_external_category',
      matchScope: 'none',
      internalCategoryId: 'internal-category-1',
      productCatalogIds: ['catalog-primary'],
      matchingMappingCount: 1,
      validMappingCount: 0,
      catalogMatchedMappingCount: 0,
    });
  });

  it('reports missing internal category before checking mappings', () => {
    const result = selectPreferredTraderaCategoryMappingResolution({
      product: createProduct({
        categoryId: null,
      }),
      mappings: [createMapping()],
    });

    expect(result).toEqual({
      mapping: null,
      reason: 'missing_internal_category',
      matchScope: 'none',
      internalCategoryId: null,
      productCatalogIds: ['catalog-primary'],
      matchingMappingCount: 0,
      validMappingCount: 0,
      catalogMatchedMappingCount: 0,
    });
  });

  it('inherits mapping from parent category when product subcategory has no direct mapping', () => {
    const result = selectPreferredTraderaCategoryMappingResolution({
      product: createProduct({ categoryId: 'anime-pins' }),
      mappings: [
        createMapping({
          internalCategoryId: 'jewellery-pins',
          externalCategoryId: '1001',
          externalCategory: {
            ...createMapping().externalCategory,
            externalId: '1001',
            name: 'Pins',
            path: 'Collectibles > Pins',
          },
          internalCategory: {
            ...createMapping().internalCategory,
            id: 'jewellery-pins',
            name: 'Pins',
            parentId: 'jewellery',
          },
        }),
      ],
      internalCategories: [
        { id: 'jewellery', name: 'Jewellery', parentId: null, color: null, catalogId: 'catalog-primary', createdAt: '', updatedAt: '' } as never,
        { id: 'jewellery-pins', name: 'Pins', parentId: 'jewellery', color: null, catalogId: 'catalog-primary', createdAt: '', updatedAt: '' } as never,
        { id: 'anime-pins', name: 'Anime Pins', parentId: 'jewellery-pins', color: null, catalogId: 'catalog-primary', createdAt: '', updatedAt: '' } as never,
      ],
    });

    expect(result.reason).toBe('mapped_via_parent');
    expect(result.mapping).toEqual({
      externalCategoryId: '1001',
      externalCategoryName: 'Pins',
      externalCategoryPath: 'Collectibles > Pins',
      internalCategoryId: 'jewellery-pins',
      catalogId: 'catalog-primary',
      pathSegments: ['Collectibles', 'Pins'],
    });
  });

  it('returns no_active_mapping when no parent has a mapping either', () => {
    const result = selectPreferredTraderaCategoryMappingResolution({
      product: createProduct({ categoryId: 'anime-pins' }),
      mappings: [],
      internalCategories: [
        { id: 'jewellery', name: 'Jewellery', parentId: null, color: null, catalogId: 'catalog-primary', createdAt: '', updatedAt: '' } as never,
        { id: 'anime-pins', name: 'Anime Pins', parentId: 'jewellery', color: null, catalogId: 'catalog-primary', createdAt: '', updatedAt: '' } as never,
      ],
    });

    expect(result.reason).toBe('no_active_mapping');
    expect(result.mapping).toBeNull();
  });

  it('keeps the simple selector returning only the resolved mapping', () => {
    const result = selectPreferredTraderaCategoryMapping({
      product: createProduct(),
      mappings: [createMapping()],
    });

    expect(result).toEqual({
      externalCategoryId: '1001',
      externalCategoryName: 'Pins',
      externalCategoryPath: 'Collectibles > Pins',
      internalCategoryId: 'internal-category-1',
      catalogId: 'catalog-primary',
      pathSegments: ['Collectibles', 'Pins'],
    });
  });
});
