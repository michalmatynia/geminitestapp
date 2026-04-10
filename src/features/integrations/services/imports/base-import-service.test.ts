import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import { BASE_MARKETPLACE_CHECKBOX_OPTIONS } from '@/shared/lib/integrations/base-marketplace-checkboxes';

const mocks = vi.hoisted(() => ({
  getImportTemplateMock: vi.fn(),
  importSingleItemMock: vi.fn(),
  normalizeMappedProductMock: vi.fn(),
  pickMappedSkuMock: vi.fn(),
  resolveProducerAndTagLookupsMock: vi.fn(),
  acquireBaseImportRunLeaseMock: vi.fn(),
  heartbeatBaseImportRunLeaseMock: vi.fn(),
  createBaseImportRunMock: vi.fn(),
  getBaseImportRunDetailMock: vi.fn(),
  getBaseImportRunMock: vi.fn(),
  listBaseImportRunItemsMock: vi.fn(),
  listBaseImportRunsMock: vi.fn(),
  putBaseImportRunItemsMock: vi.fn(),
  recomputeBaseImportRunStatsMock: vi.fn(),
  requestBaseImportRunCancellationMock: vi.fn(),
  updateBaseImportRunMock: vi.fn(),
  updateBaseImportRunStatusMock: vi.fn(),
  releaseBaseImportRunLeaseMock: vi.fn(),
  fetchDetailsMapMock: vi.fn(),
  resolveBaseConnectionContextMock: vi.fn(),
  resolveCatalogLanguageContextMock: vi.fn(),
  resolvePriceGroupContextMock: vi.fn(),
  getCatalogParameterLinksMock: vi.fn(),
  findProductListingsByProductsAndConnectionAcrossProvidersMock: vi.fn(),
  getCatalogRepositoryMock: vi.fn(),
  getCustomFieldRepositoryMock: vi.fn(),
  getParameterRepositoryMock: vi.fn(),
  getProductDataProviderMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
  buildPreflightMock: vi.fn(),
  markRunItemMock: vi.fn(),
  failRemainingItemsMock: vi.fn(),
  resolveRunItemsMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/import-template-repository', () => ({
  getImportTemplate: (...args: unknown[]) => mocks.getImportTemplateMock(...args),
}));

vi.mock('@/features/integrations/services/imports/base-import-item-processor', () => ({
  importSingleItem: (...args: unknown[]) => mocks.importSingleItemMock(...args),
  normalizeMappedProduct: (...args: unknown[]) => mocks.normalizeMappedProductMock(...args),
  pickMappedSku: (...args: unknown[]) => mocks.pickMappedSkuMock(...args),
  resolveProducerAndTagLookups: (...args: unknown[]) =>
    mocks.resolveProducerAndTagLookupsMock(...args),
}));

vi.mock('@/features/integrations/services/imports/base-import-run-repository', () => ({
  acquireBaseImportRunLease: (...args: unknown[]) => mocks.acquireBaseImportRunLeaseMock(...args),
  heartbeatBaseImportRunLease: (...args: unknown[]) =>
    mocks.heartbeatBaseImportRunLeaseMock(...args),
  createBaseImportRun: (...args: unknown[]) => mocks.createBaseImportRunMock(...args),
  getBaseImportRunDetail: (...args: unknown[]) => mocks.getBaseImportRunDetailMock(...args),
  getBaseImportRun: (...args: unknown[]) => mocks.getBaseImportRunMock(...args),
  listBaseImportRunItems: (...args: unknown[]) => mocks.listBaseImportRunItemsMock(...args),
  listBaseImportRuns: (...args: unknown[]) => mocks.listBaseImportRunsMock(...args),
  putBaseImportRunItems: (...args: unknown[]) => mocks.putBaseImportRunItemsMock(...args),
  recomputeBaseImportRunStats: (...args: unknown[]) => mocks.recomputeBaseImportRunStatsMock(...args),
  requestBaseImportRunCancellation: (...args: unknown[]) =>
    mocks.requestBaseImportRunCancellationMock(...args),
  updateBaseImportRun: (...args: unknown[]) => mocks.updateBaseImportRunMock(...args),
  updateBaseImportRunStatus: (...args: unknown[]) => mocks.updateBaseImportRunStatusMock(...args),
  releaseBaseImportRunLease: (...args: unknown[]) => mocks.releaseBaseImportRunLeaseMock(...args),
}));

vi.mock('@/features/integrations/services/imports/base-import-service-context', () => ({
  fetchDetailsMap: (...args: unknown[]) => mocks.fetchDetailsMapMock(...args),
  resolveBaseConnectionContext: (...args: unknown[]) =>
    mocks.resolveBaseConnectionContextMock(...args),
  resolveCatalogLanguageContext: (...args: unknown[]) =>
    mocks.resolveCatalogLanguageContextMock(...args),
  resolvePriceGroupContext: (...args: unknown[]) => mocks.resolvePriceGroupContextMock(...args),
}));

vi.mock('@/features/integrations/services/imports/parameter-import/link-map-repository', () => ({
  getCatalogParameterLinks: (...args: unknown[]) => mocks.getCatalogParameterLinksMock(...args),
}));

vi.mock('@/features/integrations/services/product-listing-repository', () => ({
  findProductListingsByProductsAndConnectionAcrossProviders: (...args: unknown[]) =>
    mocks.findProductListingsByProductsAndConnectionAcrossProvidersMock(...args),
}));

vi.mock('@/shared/lib/products/services/catalog-repository', () => ({
  getCatalogRepository: (...args: unknown[]) => mocks.getCatalogRepositoryMock(...args),
}));

vi.mock('@/shared/lib/products/services/custom-field-repository', () => ({
  getCustomFieldRepository: (...args: unknown[]) => mocks.getCustomFieldRepositoryMock(...args),
}));

vi.mock('@/shared/lib/products/services/parameter-repository', () => ({
  getParameterRepository: (...args: unknown[]) => mocks.getParameterRepositoryMock(...args),
}));

vi.mock('@/shared/lib/products/services/product-provider', () => ({
  getProductDataProvider: (...args: unknown[]) => mocks.getProductDataProviderMock(...args),
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: (...args: unknown[]) => mocks.getProductRepositoryMock(...args),
}));

vi.mock('./base-import/preflight', () => ({
  buildPreflight: (...args: unknown[]) => mocks.buildPreflightMock(...args),
}));

vi.mock('./base-import/processor', () => ({
  markRunItem: (...args: unknown[]) => mocks.markRunItemMock(...args),
  failRemainingItems: (...args: unknown[]) => mocks.failRemainingItemsMock(...args),
}));

vi.mock('./base-import/run-items', () => ({
  resolveRunItems: (...args: unknown[]) => mocks.resolveRunItemsMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import { prepareBaseImportRun, processBaseImportRun } from './base-import-service';

const buildRun = (dryRun: boolean) => ({
  id: dryRun ? 'run-dry' : 'run-live',
  status: 'queued',
  queueJobId: null,
  cancellationRequestedAt: null,
  maxAttempts: 3,
  params: {
    connectionId: 'connection-1',
    inventoryId: 'inventory-1',
    catalogId: 'catalog-1',
    imageMode: 'links',
    uniqueOnly: false,
    allowDuplicateSku: false,
    dryRun,
    mode: 'upsert_on_base_id',
  },
  stats: {
    total: 1,
    pending: 1,
    processing: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  },
  createdAt: '2026-04-08T00:00:00.000Z',
  updatedAt: '2026-04-08T00:00:00.000Z',
  startedAt: null,
  finishedAt: null,
  summaryMessage: null,
});

const buildItem = () => ({
  id: 'item-1',
  runId: 'run-live',
  externalId: 'base-1',
  itemId: 'base-1',
  baseProductId: 'base-1',
  sku: null,
  status: 'pending',
  attempt: 0,
  idempotencyKey: 'run-live:base-1',
  action: 'pending',
  productId: null,
  importedProductId: null,
  error: null,
  errorMessage: null,
  errorCode: null,
  errorClass: null,
  retryable: null,
  nextRetryAt: null,
  lastErrorAt: null,
  payloadSnapshot: null,
  createdAt: '2026-04-08T00:00:00.000Z',
  updatedAt: '2026-04-08T00:00:00.000Z',
  startedAt: null,
  finishedAt: null,
  parameterImportSummary: null,
});

const buildCustomField = (
  overrides: Partial<ProductCustomFieldDefinition> = {}
): ProductCustomFieldDefinition => ({
  id: 'field-created',
  name: 'Market Exclusion',
  type: 'checkbox_set',
  options: BASE_MARKETPLACE_CHECKBOX_OPTIONS.map((option) => ({
    id: option.id,
    label: option.label,
  })),
  createdAt: '2026-04-08T00:00:00.000Z',
  updatedAt: '2026-04-08T00:00:00.000Z',
  ...overrides,
});

describe('processBaseImportRun custom fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const productRepository = {
      findProductsByBaseIds: vi.fn().mockResolvedValue([]),
      getProductsBySkus: vi.fn().mockResolvedValue([]),
    };
    const parameterRepository = {
      listParameters: vi.fn().mockResolvedValue([]),
      createParameter: vi.fn(),
    };
    const customFieldRepository = {
      listCustomFields: vi.fn().mockResolvedValue([]),
      getCustomFieldById: vi.fn(),
      createCustomField: vi.fn().mockImplementation(async (data) =>
        buildCustomField({
          id: data.type === 'checkbox_set' ? 'field-market-exclusion' : 'field-custom-note',
          name: data.name,
          type: data.type,
          options: data.options ?? [],
        })
      ),
      updateCustomField: vi.fn(),
      deleteCustomField: vi.fn(),
      findByName: vi.fn(),
    };

    mocks.acquireBaseImportRunLeaseMock.mockResolvedValue({ acquired: true });
    mocks.releaseBaseImportRunLeaseMock.mockResolvedValue(undefined);
    mocks.getBaseImportRunMock.mockImplementation(async (runId: string) =>
      buildRun(runId === 'run-dry')
    );
    mocks.listBaseImportRunItemsMock
      .mockResolvedValueOnce([buildItem()])
      .mockResolvedValueOnce([buildItem()])
      .mockResolvedValueOnce([]);
    mocks.updateBaseImportRunStatusMock.mockImplementation(
      async (runId: string, status: string, patch: Record<string, unknown>) => ({
        ...buildRun(runId === 'run-dry'),
        status,
        summaryMessage: (patch['summaryMessage'] as string | null | undefined) ?? null,
        finishedAt: (patch['finishedAt'] as string | null | undefined) ?? null,
      })
    );
    mocks.resolveBaseConnectionContextMock.mockResolvedValue({
      token: 'token-1',
      connectionId: 'connection-1',
      baseIntegrationId: 'integration-base',
      issue: null,
    });
    mocks.getCatalogRepositoryMock.mockResolvedValue({
      listCatalogs: vi.fn().mockResolvedValue([
        {
          id: 'catalog-1',
          defaultPriceGroupId: 'price-group-1',
        },
      ]),
    });
    mocks.getProductDataProviderMock.mockResolvedValue('mongodb');
    mocks.resolvePriceGroupContextMock.mockResolvedValue({
      defaultPriceGroupId: 'price-group-1',
      preferredCurrencies: ['EUR'],
    });
    mocks.getImportTemplateMock.mockResolvedValue(null);
    mocks.resolveProducerAndTagLookupsMock.mockResolvedValue({
      producerIdSet: new Set<string>(),
      producerNameToId: new Map<string, string>(),
      tagIdSet: new Set<string>(),
      tagNameToId: new Map<string, string>(),
      externalTagToInternalTagId: new Map<string, string>(),
    });
    mocks.getProductRepositoryMock.mockResolvedValue(productRepository);
    mocks.getParameterRepositoryMock.mockResolvedValue(parameterRepository);
    mocks.getCustomFieldRepositoryMock.mockResolvedValue(customFieldRepository);
    mocks.getCatalogParameterLinksMock.mockResolvedValue({});
    mocks.resolveCatalogLanguageContextMock.mockResolvedValue({
      languageCodes: ['en'],
      defaultLanguageCode: 'en',
    });
    mocks.fetchDetailsMapMock.mockResolvedValue(
      new Map([
        [
          'base-1',
          {
            id: 'base-1',
            base_product_id: 'base-1',
            text_fields: {
              Tradera: '1',
              custom_note: 'Handle with care',
            },
          },
        ],
      ])
    );
    mocks.normalizeMappedProductMock.mockImplementation(
      (
        _raw: unknown,
        _templateMappings: unknown,
        _preferredCurrencies: unknown,
        customFieldDefinitions: ProductCustomFieldDefinition[]
      ) => ({
        baseProductId: 'base-1',
        sku: 'SKU-1',
        customFieldDefinitions,
      })
    );
    mocks.pickMappedSkuMock.mockReturnValue('SKU-1');
    mocks.findProductListingsByProductsAndConnectionAcrossProvidersMock.mockResolvedValue(new Map());
    mocks.importSingleItemMock.mockResolvedValue({
      status: 'imported',
      action: 'imported',
      importedProductId: 'product-1',
      retryable: false,
    });
    mocks.markRunItemMock.mockResolvedValue(undefined);
    mocks.failRemainingItemsMock.mockResolvedValue(undefined);
    mocks.recomputeBaseImportRunStatsMock.mockResolvedValue({
      stats: {
        total: 1,
        pending: 0,
        processing: 0,
        imported: 1,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
    });
  });

  it('persists seeded Base custom fields for live imports and passes them into item processing', async () => {
    const result = await processBaseImportRun('run-live');

    const customFieldRepository = await mocks.getCustomFieldRepositoryMock.mock.results[0]?.value;

    expect(customFieldRepository.createCustomField).toHaveBeenNthCalledWith(1, {
      name: 'Market Exclusion',
      type: 'checkbox_set',
      options: BASE_MARKETPLACE_CHECKBOX_OPTIONS.map((option) => ({
        id: option.id,
        label: option.label,
      })),
    });
    expect(customFieldRepository.createCustomField).toHaveBeenNthCalledWith(2, {
      name: 'Custom Note',
      type: 'text',
      options: [],
    });
    expect(mocks.normalizeMappedProductMock).toHaveBeenCalledWith(
      expect.objectContaining({ base_product_id: 'base-1' }),
      [],
      ['EUR'],
      expect.arrayContaining([
        expect.objectContaining({
          id: 'field-market-exclusion',
          name: 'Market Exclusion',
        }),
        expect.objectContaining({
          id: 'field-custom-note',
          name: 'Custom Note',
        }),
      ])
    );
    expect(mocks.importSingleItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: false,
        customFieldDefinitions: expect.arrayContaining([
          expect.objectContaining({
            id: 'field-market-exclusion',
            name: 'Market Exclusion',
          }),
          expect.objectContaining({
            id: 'field-custom-note',
            name: 'Custom Note',
          }),
        ]),
        customFieldImportSeededFieldNames: expect.arrayContaining([
          'Custom Note',
          'Market Exclusion',
        ]),
      })
    );
    expect(result.status).toBe('completed');
  });

  it('simulates seeded Base custom fields during dry runs without persisting settings', async () => {
    const result = await processBaseImportRun('run-dry');

    const customFieldRepository = await mocks.getCustomFieldRepositoryMock.mock.results[0]?.value;

    expect(customFieldRepository.createCustomField).not.toHaveBeenCalled();
    expect(mocks.normalizeMappedProductMock).toHaveBeenCalledWith(
      expect.objectContaining({ base_product_id: 'base-1' }),
      [],
      ['EUR'],
      expect.arrayContaining([
        expect.objectContaining({
          id: 'base-market-exclusion',
          name: 'Market Exclusion',
        }),
        expect.objectContaining({
          id: 'base-text-custom-field-customnote',
          name: 'Custom Note',
        }),
      ])
    );
    expect(mocks.importSingleItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dryRun: true,
        customFieldDefinitions: expect.arrayContaining([
          expect.objectContaining({
            id: 'base-market-exclusion',
            name: 'Market Exclusion',
          }),
          expect.objectContaining({
            id: 'base-text-custom-field-customnote',
            name: 'Custom Note',
          }),
        ]),
        customFieldImportSeededFieldNames: expect.arrayContaining([
          'Custom Note',
          'Market Exclusion',
        ]),
      })
    );
    expect(result.status).toBe('completed');
  });

  it('creates custom fields from Base feature buckets when parameter import is disabled', async () => {
    mocks.fetchDetailsMapMock.mockResolvedValue(
      new Map([
        [
          'base-1',
          {
            id: 'base-1',
            base_product_id: 'base-1',
            text_fields: {
              features: {
                Material: 'Cotton',
              },
            },
          },
        ],
      ])
    );

    await processBaseImportRun('run-live');

    const customFieldRepository = await mocks.getCustomFieldRepositoryMock.mock.results[0]?.value;

    expect(customFieldRepository.createCustomField).toHaveBeenCalledTimes(1);
    expect(customFieldRepository.createCustomField).toHaveBeenCalledWith({
      name: 'Material',
      type: 'text',
      options: [],
    });
  });

  it('does not create custom fields from Base feature buckets when parameter import is enabled', async () => {
    mocks.getImportTemplateMock.mockResolvedValue({
      id: 'template-1',
      name: 'Import Template',
      mappings: [],
      parameterImport: {
        enabled: true,
        mode: 'all',
        languageScope: 'catalog_languages',
        createMissingParameters: false,
        overwriteExistingValues: false,
        matchBy: 'base_id_then_name',
      },
    });
    mocks.fetchDetailsMapMock.mockResolvedValue(
      new Map([
        [
          'base-1',
          {
            id: 'base-1',
            base_product_id: 'base-1',
            text_fields: {
              features: {
                Material: 'Cotton',
              },
            },
          },
        ],
      ])
    );
    mocks.getBaseImportRunMock.mockImplementation(async () => ({
      ...buildRun(false),
      params: {
        ...buildRun(false).params,
        templateId: 'template-1',
      },
    }));

    await processBaseImportRun('run-live');

    const customFieldRepository = await mocks.getCustomFieldRepositoryMock.mock.results[0]?.value;

    expect(customFieldRepository.createCustomField).not.toHaveBeenCalled();
  });

  it('persists the latest failed item cause onto the run summary and error fields', async () => {
    const failedItem = {
      ...buildItem(),
      status: 'failed',
      sku: 'FOASW022',
      errorCode: 'VALIDATION_ERROR',
      errorClass: 'permanent',
      errorMessage:
        'Validation failed for FOASW022. name_en: English name must use format: <name> | <size> | <material> | <category> | <lore or theme>',
      updatedAt: '2026-04-08T00:00:03.000Z',
      lastErrorAt: '2026-04-08T00:00:03.000Z',
    };

    mocks.listBaseImportRunItemsMock
      .mockReset()
      .mockResolvedValueOnce([buildItem()])
      .mockResolvedValueOnce([buildItem()])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([failedItem]);
    mocks.importSingleItemMock.mockResolvedValue({
      status: 'failed',
      action: 'failed',
      baseProductId: 'base-1',
      sku: 'FOASW022',
      errorCode: 'VALIDATION_ERROR',
      errorClass: 'permanent',
      retryable: false,
      errorMessage: failedItem.errorMessage,
    });
    mocks.recomputeBaseImportRunStatsMock.mockResolvedValue({
      stats: {
        total: 1,
        pending: 0,
        processing: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 1,
      },
    });

    await processBaseImportRun('run-live');

    expect(mocks.updateBaseImportRunStatusMock).toHaveBeenLastCalledWith(
      'run-live',
      'failed',
      expect.objectContaining({
        error: failedItem.errorMessage,
        errorCode: 'VALIDATION_ERROR',
        errorClass: 'permanent',
        summaryMessage: expect.stringContaining('Latest failure: FOASW022 [VALIDATION_ERROR]:'),
      })
    );
  });
});

describe('prepareBaseImportRun direct target', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.resolveBaseConnectionContextMock.mockResolvedValue({
      token: 'token-1',
      connectionId: 'connection-1',
      baseIntegrationId: 'integration-base',
      issue: null,
    });
    mocks.buildPreflightMock.mockResolvedValue({
      preflight: {
        ok: true,
        checkedAt: '2026-04-10T00:00:00.000Z',
        issues: [],
      },
      catalogExists: true,
      hasPriceGroup: true,
    });
    mocks.resolveRunItemsMock.mockResolvedValue({
      ids: [],
      resolutionError: 'SKU FOASW022 was not found in the selected inventory.',
    });
    mocks.createBaseImportRunMock.mockImplementation(async (input: Record<string, unknown>) => ({
      id: 'run-direct-target-failed',
      status: 'failed',
      params: input['params'],
      preflight: input['preflight'],
      summaryMessage: input['summaryMessage'],
      stats: {
        total: 0,
        pending: 0,
        processing: 0,
        imported: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
    }));
  });

  it('returns a preflight-style failed run when an exact target cannot be resolved', async () => {
    const result = await prepareBaseImportRun({
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: 'catalog-1',
      imageMode: 'download',
      uniqueOnly: true,
      allowDuplicateSku: false,
      directTarget: {
        type: 'sku',
        value: 'FOASW022',
      },
    });

    expect(mocks.resolveRunItemsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        directTarget: {
          type: 'sku',
          value: 'FOASW022',
        },
      })
    );
    expect(mocks.createBaseImportRunMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          mode: 'create_only',
        }),
        summaryMessage: 'Preflight failed. Resolve errors and retry import.',
        preflight: expect.objectContaining({
          ok: false,
          issues: expect.arrayContaining([
            expect.objectContaining({
              code: 'NOT_FOUND',
              message: 'SKU FOASW022 was not found in the selected inventory.',
              severity: 'error',
            }),
          ]),
        }),
      })
    );
    expect(result.status).toBe('failed');
  });
});

describe('processBaseImportRun exact target summaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const productRepository = {
      findProductsByBaseIds: vi.fn().mockResolvedValue([]),
      getProductsBySkus: vi.fn().mockResolvedValue([]),
    };
    const parameterRepository = {
      listParameters: vi.fn().mockResolvedValue([]),
    };
    const customFieldRepository = {
      listCustomFields: vi.fn().mockResolvedValue([]),
    };

    mocks.acquireBaseImportRunLeaseMock.mockResolvedValue({ acquired: true });
    mocks.releaseBaseImportRunLeaseMock.mockResolvedValue(undefined);
    mocks.getBaseImportRunMock.mockResolvedValue({
      ...buildRun(false),
      params: {
        ...buildRun(false).params,
        directTarget: {
          type: 'sku',
          value: 'KEYCHA1045',
        },
      },
    });
    mocks.listBaseImportRunItemsMock
      .mockResolvedValueOnce([buildItem()])
      .mockResolvedValueOnce([buildItem()])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          ...buildItem(),
          status: 'updated',
          sku: 'KEYCHA1045',
          importedProductId: 'product-123',
        },
      ]);
    mocks.updateBaseImportRunStatusMock.mockImplementation(
      async (runId: string, status: string, patch: Record<string, unknown>) => ({
        ...buildRun(false),
        id: runId,
        status,
        summaryMessage: (patch['summaryMessage'] as string | null | undefined) ?? null,
        finishedAt: (patch['finishedAt'] as string | null | undefined) ?? null,
      })
    );
    mocks.resolveBaseConnectionContextMock.mockResolvedValue({
      token: 'token-1',
      connectionId: 'connection-1',
      baseIntegrationId: 'integration-base',
      issue: null,
    });
    mocks.getCatalogRepositoryMock.mockResolvedValue({
      listCatalogs: vi.fn().mockResolvedValue([
        {
          id: 'catalog-1',
          defaultPriceGroupId: 'price-group-1',
        },
      ]),
    });
    mocks.getProductDataProviderMock.mockResolvedValue('mongodb');
    mocks.resolvePriceGroupContextMock.mockResolvedValue({
      defaultPriceGroupId: 'price-group-1',
      preferredCurrencies: ['EUR'],
    });
    mocks.getImportTemplateMock.mockResolvedValue(null);
    mocks.resolveProducerAndTagLookupsMock.mockResolvedValue({
      producerIdSet: new Set<string>(),
      producerNameToId: new Map<string, string>(),
      tagIdSet: new Set<string>(),
      tagNameToId: new Map<string, string>(),
      externalTagToInternalTagId: new Map<string, string>(),
    });
    mocks.getProductRepositoryMock.mockResolvedValue(productRepository);
    mocks.getParameterRepositoryMock.mockResolvedValue(parameterRepository);
    mocks.getCustomFieldRepositoryMock.mockResolvedValue(customFieldRepository);
    mocks.getCatalogParameterLinksMock.mockResolvedValue({});
    mocks.resolveCatalogLanguageContextMock.mockResolvedValue({
      languageCodes: ['en'],
      defaultLanguageCode: 'en',
    });
    mocks.fetchDetailsMapMock.mockResolvedValue(
      new Map([
        [
          'base-1',
          {
            id: 'base-1',
            base_product_id: 'base-1',
          },
        ],
      ])
    );
    mocks.normalizeMappedProductMock.mockReturnValue({
      baseProductId: 'base-1',
      sku: 'KEYCHA1045',
    });
    mocks.pickMappedSkuMock.mockReturnValue('KEYCHA1045');
    mocks.findProductListingsByProductsAndConnectionAcrossProvidersMock.mockResolvedValue(new Map());
    mocks.importSingleItemMock.mockResolvedValue({
      status: 'updated',
      action: 'updated',
      importedProductId: 'product-123',
      retryable: false,
    });
    mocks.markRunItemMock.mockResolvedValue(undefined);
    mocks.recomputeBaseImportRunStatsMock.mockResolvedValue({
      stats: {
        total: 1,
        pending: 0,
        processing: 0,
        imported: 0,
        updated: 1,
        skipped: 0,
        failed: 0,
      },
    });
  });

  it('writes an explicit summary for exact target updates', async () => {
    await processBaseImportRun('run-live');

    expect(mocks.importSingleItemMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'create_only',
        forceCreateNewProduct: true,
        persistBaseSyncIdentity: false,
      })
    );

    expect(mocks.updateBaseImportRunStatusMock).toHaveBeenLastCalledWith(
      'run-live',
      'completed',
      expect.objectContaining({
        summaryMessage: 'Exact target SKU KEYCHA1045 updated existing product product-123.',
      })
    );
  });

  it('writes a linked-create summary for exact target imports', async () => {
    mocks.importSingleItemMock.mockResolvedValueOnce({
      status: 'imported',
      action: 'imported',
      importedProductId: 'product-456',
      retryable: false,
    });
    mocks.listBaseImportRunItemsMock
      .mockReset()
      .mockResolvedValueOnce([buildItem()])
      .mockResolvedValueOnce([buildItem()])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          ...buildItem(),
          status: 'imported',
          sku: 'KEYCHA1045',
          importedProductId: 'product-456',
        },
      ]);

    await processBaseImportRun('run-live');

    expect(mocks.updateBaseImportRunStatusMock).toHaveBeenLastCalledWith(
      'run-live',
      'completed',
      expect.objectContaining({
        summaryMessage:
          'Exact target SKU KEYCHA1045 created new Base-linked product product-456 with SKU KEYCHA1045.',
      })
    );
  });
});
