import { beforeEach, describe, expect, it, vi } from 'vitest';

const applyBaseParameterImportMock = vi.hoisted(() => vi.fn());
const validateProductCreateMock = vi.hoisted(() => vi.fn());
const validateProductUpdateMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/services/imports/parameter-import/apply', () => ({
  applyBaseParameterImport: applyBaseParameterImportMock,
}));

vi.mock('@/features/products/validations', () => ({
  validateProductCreate: validateProductCreateMock,
  validateProductUpdate: validateProductUpdateMock,
}));

import { importSingleItem } from '@/features/integrations/services/imports/base-import-item-processor';

describe('base import item processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyBaseParameterImportMock.mockResolvedValue({
      applied: true,
      parameters: [{ parameterId: 'param-1', value: 'from-import' }],
      summary: {
        extracted: 1,
        resolved: 1,
        created: 0,
        written: 1,
      },
    });
    validateProductCreateMock.mockImplementation(
      async (data: unknown): Promise<{ success: boolean; data: unknown }> => ({
        success: true,
        data,
      })
    );
    validateProductUpdateMock.mockImplementation(
      async (data: unknown): Promise<{ success: boolean; data: unknown }> => ({
        success: true,
        data,
      })
    );
  });

  it('keeps explicit template-mapped parameter values when parameter import is enabled', async () => {
    const result = await importSingleItem({
      run: { id: 'run-1', params: { dryRun: true } } as never,
      item: { itemId: 'base-1' } as never,
      raw: {
        product_id: 'base-1',
        sku: 'SKU-1',
        Material: 'from-template',
      },
      baseIntegrationId: 'integration-1',
      connectionId: 'connection-1',
      token: 'token-1',
      targetCatalogId: 'catalog-1',
      defaultPriceGroupId: 'price-group-1',
      preferredPriceCurrencies: [],
      lookups: {
        producerIdSet: new Set<string>(),
        producerNameToId: new Map<string, string>(),
        tagIdSet: new Set<string>(),
        tagNameToId: new Map<string, string>(),
        externalTagToInternalTagId: new Map<string, string>(),
      },
      templateMappings: [
        {
          sourceKey: 'Material',
          targetField: 'parameter:param-1',
        },
      ],
      productRepository: {
        findProductByBaseId: vi.fn(async () => null),
        getProductBySku: vi.fn(async () => null),
      } as never,
      parameterRepository: {} as never,
      imageMode: 'links',
      dryRun: true,
      inventoryId: 'inventory-1',
      mode: 'create_only',
      allowDuplicateSku: false,
      parameterImportSettings: {
        enabled: true,
        mode: 'all',
        languageScope: 'catalog_languages',
        createMissingParameters: true,
        overwriteExistingValues: true,
        matchBy: 'name_only',
      },
      catalogLanguageCodes: ['en'],
      defaultLanguageCode: 'en',
    });

    expect(result.status).toBe('imported');
    expect(result.action).toBe('dry_run');
    expect(applyBaseParameterImportMock).toHaveBeenCalledTimes(1);
    expect(result.payloadSnapshot?.parameters).toEqual([
      { parameterId: 'param-1', value: 'from-template' },
    ]);
  });
});
