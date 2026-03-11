import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BaseExportRequestData } from '@/shared/contracts/integrations/base-com';
import type { CategoryMappingWithDetails } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products';

const mocks = vi.hoisted(() => ({
  getExportActiveTemplateIdMock: vi.fn(),
  listExportTemplatesMock: vi.fn(),
  listCategoryMappingsMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  getExportActiveTemplateId: (...args: unknown[]) => mocks.getExportActiveTemplateIdMock(...args),
  listExportTemplates: (...args: unknown[]) => mocks.listExportTemplatesMock(...args),
  getCategoryMappingRepository: () => ({
    listByConnection: (...args: unknown[]) => mocks.listCategoryMappingsMock(...args),
  }),
  getProducerMappingRepository: () => ({
    listByInternalProducerIds: vi.fn().mockResolvedValue([]),
  }),
  getTagMappingRepository: () => ({
    listByInternalTagIds: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock('@/features/products/server', () => ({
  getProducerRepository: () => ({
    getProducerById: vi.fn(),
  }),
  getTagRepository: () => ({
    getTagById: vi.fn(),
  }),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logInfo: (...args: unknown[]) => mocks.logInfoMock(...args),
    logWarning: (...args: unknown[]) => mocks.logWarningMock(...args),
  },
}));

import { prepareBaseExportMappingsAndProduct } from './preparation';

const baseRequest: BaseExportRequestData = {
  connectionId: 'connection-1',
  inventoryId: 'inventory-1',
};

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-001',
    categoryId: 'category-1',
    catalogs: [{ catalogId: 'catalog-1' }],
    producers: [],
    tags: [],
    images: [],
    imageLinks: [],
    imageBase64s: [],
    parameters: [],
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    price: 10,
    stock: 5,
    weight: null,
    ean: null,
    baseProductId: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }) as ProductWithImages;

const createCategoryMapping = (
  overrides: Partial<CategoryMappingWithDetails> = {}
): CategoryMappingWithDetails =>
  ({
    id: 'mapping-1',
    connectionId: 'connection-1',
    catalogId: 'catalog-1',
    internalCategoryId: 'category-1',
    isActive: true,
    externalCategory: {
      id: 'ext-cat-1',
      externalId: 'base-cat-77',
      name: 'Base Category',
    },
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  }) as CategoryMappingWithDetails;

describe('prepareBaseExportMappingsAndProduct', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getExportActiveTemplateIdMock.mockResolvedValue('template-1');
    mocks.listExportTemplatesMock.mockResolvedValue([
      {
        id: 'template-1',
        mappings: [
          {
            sourceKey: 'text_fields.name',
            targetField: 'name_en',
          },
        ],
      },
    ]);
  });

  it('resolves the mapped Base category for full export even when the template does not explicitly map category', async () => {
    mocks.listCategoryMappingsMock.mockResolvedValue([createCategoryMapping()]);

    const result = await prepareBaseExportMappingsAndProduct({
      data: baseRequest,
      imagesOnly: false,
      productId: 'product-1',
      resolvedInventoryId: 'inventory-1',
      product: createProduct(),
    });

    expect(result.exportProduct.categoryId).toBe('base-cat-77');
    expect(mocks.logInfoMock).toHaveBeenCalledWith(
      '[export-to-base] Resolved category mapping for export',
      expect.objectContaining({
        productId: 'product-1',
        mappedExternalCategoryId: 'base-cat-77',
      })
    );
  });

  it('clears category export when no Base category mapping exists and the template does not require it', async () => {
    mocks.listCategoryMappingsMock.mockResolvedValue([]);

    const result = await prepareBaseExportMappingsAndProduct({
      data: baseRequest,
      imagesOnly: false,
      productId: 'product-1',
      resolvedInventoryId: 'inventory-1',
      product: createProduct(),
    });

    expect(result.exportProduct.categoryId).toBeNull();
    expect(mocks.logWarningMock).toHaveBeenCalledWith(
      '[export-to-base] Skipping category export because no Base.com category mapping was found.',
      expect.objectContaining({
        productId: 'product-1',
        internalCategoryId: 'category-1',
      })
    );
  });
});
