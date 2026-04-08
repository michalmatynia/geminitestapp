import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mapBaseProductMock: vi.fn(),
  applyBaseParameterImportMock: vi.fn(),
  emitProductCacheInvalidationMock: vi.fn(),
  findProductListingByProductAndConnectionAcrossProvidersMock: vi.fn(),
  getProductListingRepositoryMock: vi.fn(),
  validateProductCreateMock: vi.fn(),
  validateProductUpdateMock: vi.fn(),
  listingHasBaseImportProvenanceMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/imports/base-mapper', () => ({
  mapBaseProduct: (...args: unknown[]) => mocks.mapBaseProductMock(...args),
}));

vi.mock('@/features/integrations/services/imports/parameter-import/apply', () => ({
  applyBaseParameterImport: (...args: unknown[]) => mocks.applyBaseParameterImportMock(...args),
}));

vi.mock('@/shared/events/products', () => ({
  emitProductCacheInvalidation: () => mocks.emitProductCacheInvalidationMock(),
}));

vi.mock('@/features/integrations/services/product-listing-repository', () => ({
  findProductListingByProductAndConnectionAcrossProviders: (...args: unknown[]) =>
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock(...args),
  getProductListingRepository: () => mocks.getProductListingRepositoryMock(),
}));

vi.mock('@/shared/lib/products/validations', () => ({
  validateProductCreate: (...args: unknown[]) => mocks.validateProductCreateMock(...args),
  validateProductUpdate: (...args: unknown[]) => mocks.validateProductUpdateMock(...args),
}));

vi.mock('@/features/integrations/services/imports/base-import-provenance', () => ({
  listingHasBaseImportProvenance: (...args: unknown[]) =>
    mocks.listingHasBaseImportProvenanceMock(...args),
}));

import { importSingleItem } from './base-import-item-processor';

const defaultParameterImportResult = {
  applied: false,
  parameters: [],
  summary: {
    extracted: 0,
    resolved: 0,
    created: 0,
    written: 0,
  },
};

const buildRun = () =>
  ({
    id: 'run-1',
    status: 'running',
    params: {
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: 'catalog-1',
      imageMode: 'links',
      uniqueOnly: false,
      allowDuplicateSku: false,
      mode: 'upsert_on_base_id',
    },
    createdAt: '2026-04-08T00:00:00.000Z',
    updatedAt: '2026-04-08T00:00:00.000Z',
  }) as const;

const buildItem = () =>
  ({
    id: 'item-1',
    runId: 'run-1',
    externalId: 'base-1',
    itemId: 'base-1',
    status: 'queued',
    createdAt: '2026-04-08T00:00:00.000Z',
    updatedAt: '2026-04-08T00:00:00.000Z',
    attempt: 1,
  }) as const;

const buildProductRepository = (overrides?: Record<string, unknown>) => ({
  findProductByBaseId: vi.fn().mockResolvedValue(null),
  getProductBySku: vi.fn().mockResolvedValue(null),
  updateProduct: vi.fn().mockResolvedValue(null),
  createProduct: vi.fn().mockResolvedValue(null),
  replaceProductCatalogs: vi.fn().mockResolvedValue(undefined),
  replaceProductProducers: vi.fn().mockResolvedValue(undefined),
  replaceProductTags: vi.fn().mockResolvedValue(undefined),
  replaceProductImages: vi.fn().mockResolvedValue(undefined),
  addProductImages: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const buildListingRepository = () => ({
  updateListingExternalId: vi.fn().mockResolvedValue(undefined),
  updateListingInventoryId: vi.fn().mockResolvedValue(undefined),
  updateListingStatus: vi.fn().mockResolvedValue(undefined),
  updateListing: vi.fn().mockResolvedValue(undefined),
  createListing: vi.fn().mockResolvedValue({ id: 'listing-1' }),
});

const buildInput = (overrides?: Record<string, unknown>) => ({
  run: buildRun(),
  item: buildItem(),
  raw: {
    base_product_id: 'base-1',
  },
  baseIntegrationId: 'integration-1',
  connectionId: 'connection-1',
  token: 'token-1',
  targetCatalogId: 'catalog-1',
  defaultPriceGroupId: 'price-group-1',
  preferredPriceCurrencies: ['USD'],
  lookups: {
    producerIdSet: new Set<string>(),
    producerNameToId: new Map<string, string>(),
    tagIdSet: new Set<string>(),
    tagNameToId: new Map<string, string>(),
    externalTagToInternalTagId: new Map<string, string>(),
  },
  templateMappings: [],
  productRepository: buildProductRepository(),
  parameterRepository: {
    listParameters: vi.fn().mockResolvedValue([]),
    createParameter: vi.fn(),
  },
  imageMode: 'links' as const,
  dryRun: false,
  inventoryId: 'inventory-1',
  mode: 'upsert_on_base_id' as const,
  allowDuplicateSku: false,
  customFieldDefinitions: [
    {
      id: 'notes',
      name: 'Internal Notes',
      type: 'text',
      options: [],
      createdAt: '2026-04-08T00:00:00.000Z',
      updatedAt: '2026-04-08T00:00:00.000Z',
    },
  ],
  ...overrides,
});

describe('importSingleItem custom fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.applyBaseParameterImportMock.mockResolvedValue(defaultParameterImportResult);
    mocks.validateProductCreateMock.mockImplementation(async (data: unknown) => ({
      success: true,
      data,
    }));
    mocks.validateProductUpdateMock.mockImplementation(async (data: unknown) => ({
      success: true,
      data,
    }));
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue(null);
    mocks.getProductListingRepositoryMock.mockReturnValue(buildListingRepository());
    mocks.listingHasBaseImportProvenanceMock.mockReturnValue(false);
  });

  it('normalizes mapped custom fields before product creation', async () => {
    mocks.mapBaseProductMock.mockReturnValue({
      sku: 'SKU-1',
      baseProductId: 'base-1',
      customFields: [
        { fieldId: 'notes', textValue: '  Old value  ' },
        { fieldId: 'flags', selectedOptionIds: ['tradera', '', 'tradera'] },
        { fieldId: 'notes', textValue: '  Keep this one  ' },
      ],
      producerIds: [],
      tagIds: [],
      imageLinks: [],
    });

    const productRepository = buildProductRepository({
      createProduct: vi.fn().mockResolvedValue({ id: 'product-1', sku: 'SKU-1' }),
    });

    const result = await importSingleItem(
      buildInput({
        productRepository,
      })
    );

    expect(mocks.mapBaseProductMock).toHaveBeenCalledWith(
      { base_product_id: 'base-1' },
      [],
      expect.objectContaining({
        preferredPriceCurrencies: ['USD'],
        customFieldDefinitions: expect.any(Array),
      })
    );
    expect(mocks.validateProductCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'SKU-1',
        importSource: 'base',
        customFields: [
          { fieldId: 'notes', textValue: 'Keep this one' },
          { fieldId: 'flags', selectedOptionIds: ['tradera'] },
        ],
      })
    );
    expect(productRepository.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        customFields: [
          { fieldId: 'notes', textValue: 'Keep this one' },
          { fieldId: 'flags', selectedOptionIds: ['tradera'] },
        ],
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'imported',
        action: 'imported',
        importedProductId: 'product-1',
      })
    );
  });

  it('merges mapped custom fields with existing product values on update', async () => {
    mocks.mapBaseProductMock.mockReturnValue({
      sku: 'SKU-1',
      baseProductId: 'base-1',
      customFields: [
        { fieldId: 'notes', textValue: 'Updated from import' },
        { fieldId: 'flags', selectedOptionIds: ['tradera', 'tradera', ''] },
      ],
      producerIds: [],
      tagIds: [],
      imageLinks: [],
    });

    const existingProduct = {
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'base-1',
      importSource: 'manual',
      parameters: [],
      customFields: [
        { fieldId: 'legacy', textValue: 'Keep existing' },
        { fieldId: 'notes', textValue: 'Old value' },
      ],
    };
    const productRepository = buildProductRepository({
      findProductByBaseId: vi.fn().mockResolvedValue(existingProduct),
      updateProduct: vi.fn().mockResolvedValue({ id: 'product-1', sku: 'SKU-1' }),
    });
    const listingRepository = buildListingRepository();
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        externalListingId: 'base-1',
        inventoryId: 'inventory-1',
        status: 'active',
        marketplaceData: {},
      },
      repository: listingRepository,
    });

    const result = await importSingleItem(
      buildInput({
        productRepository,
      })
    );

    const expectedCustomFields = [
      { fieldId: 'legacy', textValue: 'Keep existing' },
      { fieldId: 'notes', textValue: 'Updated from import' },
      { fieldId: 'flags', selectedOptionIds: ['tradera'] },
    ];

    expect(mocks.validateProductUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'SKU-1',
        customFields: expectedCustomFields,
      })
    );
    expect(productRepository.updateProduct).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({
        customFields: expectedCustomFields,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        status: 'updated',
        action: 'updated',
        importedProductId: 'product-1',
        payloadSnapshot: expect.objectContaining({
          customFields: expectedCustomFields,
        }),
      })
    );
  });

  it('does not overwrite existing custom fields on update when no template custom fields were mapped', async () => {
    mocks.mapBaseProductMock.mockReturnValue({
      sku: 'SKU-1',
      baseProductId: 'base-1',
      customFields: [],
      producerIds: [],
      tagIds: [],
      imageLinks: [],
    });

    const existingProduct = {
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'base-1',
      importSource: 'manual',
      parameters: [],
      customFields: [{ fieldId: 'notes', textValue: 'Keep existing' }],
    };
    const productRepository = buildProductRepository({
      findProductByBaseId: vi.fn().mockResolvedValue(existingProduct),
      updateProduct: vi.fn().mockResolvedValue({ id: 'product-1', sku: 'SKU-1' }),
    });
    const listingRepository = buildListingRepository();
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        externalListingId: 'base-1',
        inventoryId: 'inventory-1',
        status: 'active',
        marketplaceData: {},
      },
      repository: listingRepository,
    });

    await importSingleItem(
      buildInput({
        productRepository,
      })
    );

    expect(mocks.validateProductUpdateMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        customFields: expect.anything(),
      })
    );
    expect(productRepository.updateProduct).toHaveBeenCalledWith(
      'product-1',
      expect.not.objectContaining({
        customFields: expect.anything(),
      })
    );
  });
});
