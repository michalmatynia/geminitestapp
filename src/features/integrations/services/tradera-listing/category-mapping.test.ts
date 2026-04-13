import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getCategoryByIdMock, listCategoriesMock, listByConnectionMock, listByInternalCategoryMock } = vi.hoisted(() => ({
  getCategoryByIdMock: vi.fn(),
  listCategoriesMock: vi.fn(),
  listByConnectionMock: vi.fn(),
  listByInternalCategoryMock: vi.fn(),
}));

const { captureExceptionMock } = vi.hoisted(() => ({
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/category-repository', () => ({
  getCategoryRepository: async () => ({
    getCategoryById: getCategoryByIdMock,
    listCategories: listCategoriesMock,
  }),
}));

vi.mock('../category-mapping-repository', () => ({
  getCategoryMappingRepository: () => ({
    listByConnection: listByConnectionMock,
    listByInternalCategory: listByInternalCategoryMock,
  }),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import type { CategoryMappingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  resolveProductCatalogIds,
  resolveTraderaCategoryMappingResolutionForProduct,
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

beforeEach(() => {
  vi.clearAllMocks();
  getCategoryByIdMock.mockResolvedValue(null);
  listCategoriesMock.mockResolvedValue([]);
  listByConnectionMock.mockResolvedValue([]);
  listByInternalCategoryMock.mockResolvedValue([]);
  captureExceptionMock.mockResolvedValue(undefined);
});

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

  it('loads parent categories from the assigned category catalog during async resolution', async () => {
    listByConnectionMock.mockResolvedValue([
      createMapping({
        internalCategoryId: 'jewellery-pins',
        catalogId: 'catalog-jewellery',
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
          catalogId: 'catalog-jewellery',
        },
      }),
    ]);
    getCategoryByIdMock.mockResolvedValue({
      id: 'anime-pins',
      name: 'Anime Pins',
      parentId: 'jewellery-pins',
      color: null,
      catalogId: 'catalog-jewellery',
      createdAt: '',
      updatedAt: '',
    });
    listCategoriesMock.mockResolvedValue([
      {
        id: 'jewellery',
        name: 'Jewellery',
        parentId: null,
        color: null,
        catalogId: 'catalog-jewellery',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'jewellery-pins',
        name: 'Pins',
        parentId: 'jewellery',
        color: null,
        catalogId: 'catalog-jewellery',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'anime-pins',
        name: 'Anime Pins',
        parentId: 'jewellery-pins',
        color: null,
        catalogId: 'catalog-jewellery',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    const result = await resolveTraderaCategoryMappingResolutionForProduct({
      connectionId: 'connection-1',
      product: createProduct({
        categoryId: 'anime-pins',
        catalogId: 'catalog-primary',
        catalogs: [
          {
            productId: 'product-1',
            catalogId: 'catalog-primary',
            assignedAt: '2026-04-02T00:00:00.000Z',
          },
          {
            productId: 'product-1',
            catalogId: 'catalog-jewellery',
            assignedAt: '2026-04-02T00:00:00.000Z',
          },
        ],
      }),
    });

    expect(getCategoryByIdMock).toHaveBeenCalledWith('anime-pins');
    expect(listCategoriesMock).toHaveBeenCalledWith({ catalogId: 'catalog-jewellery' });
    expect(result).toEqual({
      mapping: {
        externalCategoryId: '1001',
        externalCategoryName: 'Pins',
        externalCategoryPath: 'Collectibles > Pins',
        internalCategoryId: 'jewellery-pins',
        catalogId: 'catalog-jewellery',
        pathSegments: ['Collectibles', 'Pins'],
      },
      reason: 'mapped_via_parent',
      matchScope: 'catalog_match',
      internalCategoryId: 'anime-pins',
      productCatalogIds: ['catalog-primary', 'catalog-jewellery'],
      matchingMappingCount: 1,
      validMappingCount: 1,
      catalogMatchedMappingCount: 1,
    });
  });

  it('resolves parent mapping when the category carries the catalog but product.catalogId is empty', async () => {
    listByConnectionMock.mockResolvedValue([
      createMapping({
        internalCategoryId: 'jewellery-pins',
        catalogId: 'catalog-jewellery',
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
          catalogId: 'catalog-jewellery',
        },
      }),
    ]);
    getCategoryByIdMock.mockResolvedValue({
      id: 'anime-pins',
      name: 'Anime Pins',
      parentId: 'jewellery-pins',
      color: null,
      catalogId: 'catalog-jewellery',
      createdAt: '',
      updatedAt: '',
    });
    listCategoriesMock.mockResolvedValue([
      {
        id: 'jewellery',
        name: 'Jewellery',
        parentId: null,
        color: null,
        catalogId: 'catalog-jewellery',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'jewellery-pins',
        name: 'Pins',
        parentId: 'jewellery',
        color: null,
        catalogId: 'catalog-jewellery',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'anime-pins',
        name: 'Anime Pins',
        parentId: 'jewellery-pins',
        color: null,
        catalogId: 'catalog-jewellery',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    const result = await resolveTraderaCategoryMappingResolutionForProduct({
      connectionId: 'connection-1',
      product: createProduct({
        categoryId: 'anime-pins',
        catalogId: '',
        catalogs: [
          {
            productId: 'product-1',
            catalogId: 'catalog-jewellery',
            assignedAt: '2026-04-02T00:00:00.000Z',
          },
        ],
      }),
    });

    expect(listCategoriesMock).toHaveBeenCalledWith({ catalogId: 'catalog-jewellery' });
    expect(result.reason).toBe('mapped_via_parent');
    expect(result.mapping).toEqual({
      externalCategoryId: '1001',
      externalCategoryName: 'Pins',
      externalCategoryPath: 'Collectibles > Pins',
      internalCategoryId: 'jewellery-pins',
      catalogId: 'catalog-jewellery',
      pathSegments: ['Collectibles', 'Pins'],
    });
  });

  it('logs category-tree load failures before falling back to the direct result', async () => {
    listByConnectionMock.mockResolvedValue([]);
    getCategoryByIdMock.mockResolvedValue({
      id: 'anime-pins',
      name: 'Anime Pins',
      parentId: 'jewellery-pins',
      color: null,
      catalogId: 'catalog-jewellery',
      createdAt: '',
      updatedAt: '',
    });
    const repositoryError = new Error('category repository offline');
    listCategoriesMock.mockRejectedValue(repositoryError);

    const result = await resolveTraderaCategoryMappingResolutionForProduct({
      connectionId: 'connection-1',
      product: createProduct({
        id: 'product-9',
        categoryId: 'anime-pins',
        catalogId: 'catalog-primary',
        catalogs: [
          {
            productId: 'product-9',
            catalogId: 'catalog-primary',
            assignedAt: '2026-04-02T00:00:00.000Z',
          },
          {
            productId: 'product-9',
            catalogId: 'catalog-jewellery',
            assignedAt: '2026-04-02T00:00:00.000Z',
          },
        ],
      }),
    });

    expect(result).toEqual({
      mapping: null,
      reason: 'no_active_mapping',
      matchScope: 'none',
      internalCategoryId: 'anime-pins',
      productCatalogIds: ['catalog-primary', 'catalog-jewellery'],
      matchingMappingCount: 0,
      validMappingCount: 0,
      catalogMatchedMappingCount: 0,
    });
    expect(captureExceptionMock).toHaveBeenCalledWith(
      repositoryError,
      expect.objectContaining({
        service: 'tradera-category-mapping',
        action: 'resolveTraderaCategoryMappingResolutionForProduct',
        connectionId: 'connection-1',
        productId: 'product-9',
        productCategoryId: 'anime-pins',
        productCatalogIds: ['catalog-primary', 'catalog-jewellery'],
        requestedCatalogId: 'catalog-primary',
        resolvedCategoryCatalogId: 'catalog-jewellery',
      })
    );
  });

  it('recovers a direct Tradera mapping from another connection when the current connection has none', async () => {
    listByConnectionMock.mockResolvedValue([]);
    listByInternalCategoryMock.mockResolvedValue([
      createMapping({
        id: 'legacy-mapping-1',
        connectionId: 'legacy-connection-1',
        externalCategoryId: '3343738',
        externalCategory: {
          ...createMapping().externalCategory,
          id: 'legacy-external-category-1',
          connectionId: 'legacy-connection-1',
          externalId: '3343738',
          name: 'Gaming Wallets',
          path: 'Gadget Accessories > Wallets > Gaming Wallets',
        },
      }),
    ]);
    getCategoryByIdMock.mockResolvedValue({
      id: 'internal-category-1',
      name: 'Wallets',
      parentId: null,
      color: null,
      catalogId: 'catalog-primary',
      createdAt: '',
      updatedAt: '',
    });
    listCategoriesMock.mockResolvedValue([
      {
        id: 'internal-category-1',
        name: 'Wallets',
        parentId: null,
        color: null,
        catalogId: 'catalog-primary',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    const result = await resolveTraderaCategoryMappingResolutionForProduct({
      connectionId: 'connection-1',
      product: createProduct(),
    });

    expect(listByInternalCategoryMock).toHaveBeenCalledWith(
      'internal-category-1',
      'catalog-primary'
    );
    expect(result.resolvedFromDifferentConnection).toBe(true);
    expect(result.resolvedMappingConnectionId).toBe('legacy-connection-1');
    expect(result).toEqual({
      mapping: {
        externalCategoryId: '3343738',
        externalCategoryName: 'Gaming Wallets',
        externalCategoryPath: 'Gadget Accessories > Wallets > Gaming Wallets',
        internalCategoryId: 'internal-category-1',
        catalogId: 'catalog-primary',
        pathSegments: ['Gadget Accessories', 'Wallets', 'Gaming Wallets'],
      },
      reason: 'mapped',
      matchScope: 'catalog_match',
      internalCategoryId: 'internal-category-1',
      productCatalogIds: ['catalog-primary'],
      matchingMappingCount: 1,
      validMappingCount: 1,
      catalogMatchedMappingCount: 1,
    });
  });

  it('dedupes identical cross-connection Tradera mappings by path before resolving fallback', async () => {
    listByConnectionMock.mockResolvedValue([]);
    listByInternalCategoryMock.mockResolvedValue([
      createMapping({
        id: 'legacy-mapping-1',
        connectionId: 'legacy-connection-1',
        externalCategoryId: '3343738',
        updatedAt: '2026-04-10T10:00:00.000Z',
        externalCategory: {
          ...createMapping().externalCategory,
          id: 'legacy-external-category-1',
          connectionId: 'legacy-connection-1',
          externalId: '3343738',
          name: 'Gaming Wallets',
          path: 'Gadget Accessories > Wallets > Gaming Wallets',
        },
      }),
      createMapping({
        id: 'legacy-mapping-2',
        connectionId: 'legacy-connection-2',
        externalCategoryId: '778899',
        updatedAt: '2026-04-11T10:00:00.000Z',
        externalCategory: {
          ...createMapping().externalCategory,
          id: 'legacy-external-category-2',
          connectionId: 'legacy-connection-2',
          externalId: '778899',
          name: 'Gaming Wallets',
          path: 'Gadget Accessories > Wallets > Gaming Wallets',
        },
      }),
    ]);
    getCategoryByIdMock.mockResolvedValue({
      id: 'internal-category-1',
      name: 'Wallets',
      parentId: null,
      color: null,
      catalogId: 'catalog-primary',
      createdAt: '',
      updatedAt: '',
    });
    listCategoriesMock.mockResolvedValue([
      {
        id: 'internal-category-1',
        name: 'Wallets',
        parentId: null,
        color: null,
        catalogId: 'catalog-primary',
        createdAt: '',
        updatedAt: '',
      },
    ]);

    const result = await resolveTraderaCategoryMappingResolutionForProduct({
      connectionId: 'connection-1',
      product: createProduct(),
    });

    expect(result.reason).toBe('mapped');
    expect(result.resolvedFromDifferentConnection).toBe(true);
    expect(result.resolvedMappingConnectionId).toBe('legacy-connection-2');
    expect(result.mapping).toEqual({
      externalCategoryId: '778899',
      externalCategoryName: 'Gaming Wallets',
      externalCategoryPath: 'Gadget Accessories > Wallets > Gaming Wallets',
      internalCategoryId: 'internal-category-1',
      catalogId: 'catalog-primary',
      pathSegments: ['Gadget Accessories', 'Wallets', 'Gaming Wallets'],
    });
  });
});
