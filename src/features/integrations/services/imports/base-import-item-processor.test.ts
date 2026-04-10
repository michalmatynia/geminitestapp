import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mapBaseProductMock: vi.fn(),
  collectCustomFieldImportDiagnosticsMock: vi.fn(),
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
  collectCustomFieldImportDiagnostics: (...args: unknown[]) =>
    mocks.collectCustomFieldImportDiagnosticsMock(...args),
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
  forceCreateNewProduct: false,
  persistBaseSyncIdentity: true,
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

    mocks.collectCustomFieldImportDiagnosticsMock.mockReturnValue({
      mergedCustomFields: [],
      autoMatchedFieldNames: [],
      explicitMappedFieldNames: [],
      skippedFieldNames: [],
      overriddenFieldNames: [],
    });
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

  it('reports seeded generic Base custom fields in item metadata when they are auto-matched', async () => {
    mocks.mapBaseProductMock.mockReturnValue({
      sku: 'SKU-1',
      baseProductId: 'base-1',
      customFields: [{ fieldId: 'notes', textValue: 'Handle with care' }],
      producerIds: [],
      tagIds: [],
      imageLinks: [],
    });
    mocks.collectCustomFieldImportDiagnosticsMock.mockReturnValue({
      mergedCustomFields: [{ fieldId: 'notes', textValue: 'Handle with care' }],
      autoMatchedFieldNames: ['Custom Note'],
      explicitMappedFieldNames: [],
      skippedFieldNames: [],
      overriddenFieldNames: [],
    });

    const productRepository = buildProductRepository({
      createProduct: vi.fn().mockResolvedValue({ id: 'product-1', sku: 'SKU-1' }),
    });

    const result = await importSingleItem(
      buildInput({
        productRepository,
        customFieldImportSeededFieldNames: ['Custom Note', 'Unused Field'],
      })
    );

    expect(result).toEqual(
      expect.objectContaining({
        metadata: {
          customFieldImport: {
            seededFieldNames: ['Custom Note'],
            autoMatchedFieldNames: ['Custom Note'],
            explicitMappedFieldNames: [],
            skippedFieldNames: [],
            overriddenFieldNames: [],
          },
        },
      })
    );
  });

  it('allows Base import create to fall back to lenient name validation for legacy titles', async () => {
    mocks.mapBaseProductMock.mockReturnValue({
      sku: 'SKU-1',
      baseProductId: 'base-1',
      name_en: 'Sword | Foam | 90 cm | Diablo',
      producerIds: [],
      tagIds: [],
      imageLinks: [],
    });
    mocks.validateProductCreateMock.mockResolvedValue({
      success: false,
      errors: [
        {
          field: 'name_en',
          message:
            'English name must use format: <name> | <size> | <material> | <category> | <lore or theme>',
          code: 'custom',
          severity: 'medium',
        },
      ],
      metadata: {
        validationTime: 1,
        rulesApplied: [],
        cacheHit: false,
        source: 'schema',
      },
    });
    const productRepository = buildProductRepository({
      createProduct: vi.fn().mockResolvedValue({ id: 'product-1', sku: 'SKU-1' }),
    });

    const result = await importSingleItem(
      buildInput({
        productRepository,
      })
    );

    expect(mocks.validateProductUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'SKU-1',
        name_en: 'Sword | Foam | 90 cm | Diablo',
        importSource: 'base',
      })
    );
    expect(productRepository.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'SKU-1',
        name_en: 'Sword | Foam | 90 cm | Diablo',
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

  it('forces exact-target imports to create a detached product with a unique SKU instead of updating', async () => {
    mocks.mapBaseProductMock.mockReturnValue({
      sku: 'SKU-1',
      baseProductId: 'base-1',
      name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
      customFields: [{ fieldId: 'market-exclusion', selectedOptionIds: ['tradera'] }],
      producerIds: [],
      tagIds: [],
      imageLinks: [],
    });

    const existingByBaseId = {
      id: 'product-existing-base',
      sku: 'BASE-SYNC-1',
      baseProductId: 'base-1',
      importSource: 'base',
      parameters: [],
      customFields: [],
    };
    const existingBySku = {
      id: 'product-existing-sku',
      sku: 'SKU-1',
      baseProductId: null,
      importSource: null,
      parameters: [],
      customFields: [],
    };
    const getProductBySku = vi.fn(async (sku: string) => {
      if (sku === 'SKU-1') return existingBySku;
      return null;
    });
    const createProduct = vi.fn().mockResolvedValue({ id: 'product-created', sku: 'SKU-1-1' });
    const productRepository = buildProductRepository({
      findProductByBaseId: vi.fn().mockResolvedValue(existingByBaseId),
      getProductBySku,
      createProduct,
    });

    const result = await importSingleItem(
      buildInput({
        run: {
          ...buildRun(),
          params: {
            ...buildRun().params,
            directTarget: {
              type: 'sku',
              value: 'SKU-1',
            },
          },
        },
        productRepository,
        mode: 'create_only',
        forceCreateNewProduct: true,
        persistBaseSyncIdentity: false,
      })
    );

    expect(mocks.validateProductCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'SKU-1-1',
        baseProductId: null,
        importSource: null,
        customFields: [{ fieldId: 'market-exclusion', selectedOptionIds: ['tradera'] }],
      })
    );
    expect(createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'SKU-1-1',
        baseProductId: null,
        importSource: null,
        customFields: [{ fieldId: 'market-exclusion', selectedOptionIds: ['tradera'] }],
      })
    );
    expect(mocks.findProductListingByProductAndConnectionAcrossProvidersMock).not.toHaveBeenCalled();
    expect(mocks.getProductListingRepositoryMock).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: 'imported',
        action: 'imported',
        importedProductId: 'product-created',
        sku: 'SKU-1-1',
        baseProductId: 'base-1',
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

  it('adds linked title-term parameters from the structured English name during product creation', async () => {
    mocks.mapBaseProductMock.mockReturnValue({
      sku: 'SKU-1',
      baseProductId: 'base-1',
      name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
      producerIds: [],
      tagIds: [],
      imageLinks: [],
    });
    mocks.applyBaseParameterImportMock.mockResolvedValue({
      applied: true,
      parameters: [],
      summary: {
        extracted: 0,
        resolved: 0,
        created: 0,
        written: 0,
      },
    });

    const productRepository = buildProductRepository({
      createProduct: vi.fn().mockResolvedValue({ id: 'product-1', sku: 'SKU-1' }),
    });

    await importSingleItem(
      buildInput({
        productRepository,
        prefetchedParameters: [
          {
            id: 'param-material',
            catalogId: 'catalog-1',
            name: 'Material',
            name_en: 'Material',
            name_pl: null,
            name_de: null,
            selectorType: 'text',
            optionLabels: [],
            linkedTitleTermType: 'material',
            createdAt: '2026-04-08T00:00:00.000Z',
            updatedAt: '2026-04-08T00:00:00.000Z',
          },
        ],
      })
    );

    expect(mocks.validateProductCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: [
          {
            parameterId: 'param-material',
            value: '',
          },
        ],
      })
    );
  });

  it('lets linked title-term parameters override imported static parameter values', async () => {
    mocks.mapBaseProductMock.mockReturnValue({
      sku: 'SKU-1',
      baseProductId: 'base-1',
      name_en: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
      producerIds: [],
      tagIds: [],
      imageLinks: [],
    });
    mocks.applyBaseParameterImportMock.mockResolvedValue({
      applied: true,
      parameters: [
        {
          parameterId: 'param-material',
          value: 'Plastic',
          valuesByLanguage: { en: 'Plastic' },
        },
        {
          parameterId: 'param-color',
          value: 'Blue',
        },
      ],
      summary: {
        extracted: 2,
        resolved: 2,
        created: 0,
        written: 2,
      },
    });

    const productRepository = buildProductRepository({
      createProduct: vi.fn().mockResolvedValue({ id: 'product-1', sku: 'SKU-1' }),
    });

    await importSingleItem(
      buildInput({
        productRepository,
        prefetchedParameters: [
          {
            id: 'param-material',
            catalogId: 'catalog-1',
            name: 'Material',
            name_en: 'Material',
            name_pl: null,
            name_de: null,
            selectorType: 'text',
            optionLabels: [],
            linkedTitleTermType: 'material',
            createdAt: '2026-04-08T00:00:00.000Z',
            updatedAt: '2026-04-08T00:00:00.000Z',
          },
          {
            id: 'param-color',
            catalogId: 'catalog-1',
            name: 'Color',
            name_en: 'Color',
            name_pl: null,
            name_de: null,
            selectorType: 'text',
            optionLabels: [],
            linkedTitleTermType: null,
            createdAt: '2026-04-08T00:00:00.000Z',
            updatedAt: '2026-04-08T00:00:00.000Z',
          },
        ],
      })
    );

    expect(mocks.validateProductCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.arrayContaining([
          {
            parameterId: 'param-material',
            value: '',
          },
          {
            parameterId: 'param-color',
            value: 'Blue',
          },
        ]),
      })
    );
  });

  it('clears linked parameter values on update instead of reusing imported or stale title-derived data', async () => {
    mocks.mapBaseProductMock.mockReturnValue({
      sku: 'SKU-1',
      baseProductId: 'base-1',
      name_en: 'Scout Regiment | 4 cm | Unknown Material | Anime Pin | Attack On Titan',
      producerIds: [],
      tagIds: [],
      imageLinks: [],
    });
    mocks.applyBaseParameterImportMock.mockResolvedValue({
      applied: true,
      parameters: [
        {
          parameterId: 'param-material',
          value: 'Metal',
          valuesByLanguage: { en: 'Metal', pl: 'Metal PL' },
        },
        {
          parameterId: 'param-color',
          value: 'Blue',
        },
      ],
      summary: {
        extracted: 1,
        resolved: 1,
        created: 0,
        written: 0,
      },
    });

    const existingProduct = {
      id: 'product-1',
      sku: 'SKU-1',
      baseProductId: 'base-1',
      importSource: 'base',
      parameters: [
        {
          parameterId: 'param-material',
          value: 'Metal',
          valuesByLanguage: { en: 'Metal', pl: 'Metal PL' },
        },
        {
          parameterId: 'param-color',
          value: 'Blue',
        },
      ],
      customFields: [],
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
        prefetchedParameters: [
          {
            id: 'param-material',
            catalogId: 'catalog-1',
            name: 'Material',
            name_en: 'Material',
            name_pl: null,
            name_de: null,
            selectorType: 'text',
            optionLabels: [],
            linkedTitleTermType: 'material',
            createdAt: '2026-04-08T00:00:00.000Z',
            updatedAt: '2026-04-08T00:00:00.000Z',
          },
          {
            id: 'param-color',
            catalogId: 'catalog-1',
            name: 'Color',
            name_en: 'Color',
            name_pl: null,
            name_de: null,
            selectorType: 'text',
            optionLabels: [],
            linkedTitleTermType: null,
            createdAt: '2026-04-08T00:00:00.000Z',
            updatedAt: '2026-04-08T00:00:00.000Z',
          },
        ],
      })
    );

    expect(mocks.validateProductUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.arrayContaining([
          {
            parameterId: 'param-material',
            value: '',
          },
          {
            parameterId: 'param-color',
            value: 'Blue',
          },
        ]),
      })
    );
  });
});
