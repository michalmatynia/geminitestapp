import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listExportTemplatesMock } = vi.hoisted(() => ({
  listExportTemplatesMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  collectProductImageDiagnostics: vi.fn(),
  fetchBaseWarehouses: vi.fn(),
  getExportActiveTemplateId: vi.fn(async () => null),
  getProductImagesAsBase64: vi.fn(),
  listExportTemplates: listExportTemplatesMock,
  normalizeStockKey: (value: string) => value.trim(),
  getCategoryMappingRepository: vi.fn(() => ({
    listByConnection: vi.fn(async () => []),
  })),
  getProducerMappingRepository: vi.fn(() => ({
    listByInternalProducerIds: vi.fn(async () => []),
  })),
  getTagMappingRepository: vi.fn(() => ({
    listByInternalTagIds: vi.fn(async () => []),
  })),
}));

vi.mock('@/features/products/server', () => ({
  getProducerRepository: vi.fn(async () => ({
    getProducerById: vi.fn(async () => null),
  })),
  getTagRepository: vi.fn(async () => ({
    getTagById: vi.fn(async () => null),
  })),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn(async () => undefined),
  logSystemError: vi.fn(async () => undefined),
  logSystemWarning: vi.fn(async () => undefined),
  ErrorSystem: {
    logInfo: vi.fn(async () => undefined),
    logWarning: vi.fn(async () => undefined),
    captureException: vi.fn(async () => undefined),
  },
}));

import { prepareBaseExportMappingsAndProduct } from '@/app/api/v2/integrations/products/[id]/export-to-base/segments/preparation';

describe('prepareBaseExportMappingsAndProduct', () => {
  beforeEach(() => {
    listExportTemplatesMock.mockReset();
  });

  it('keeps canonical v2 parameter mappings unchanged', async () => {
    listExportTemplatesMock.mockResolvedValue([
      {
        id: 'tpl-v2',
        mappings: [
          {
            sourceKey: 'text_fields.features.Material',
            targetField: 'parameter:param-material',
          },
          {
            sourceKey: 'text_fields.features|pl.Materiał',
            targetField: 'parameter:param-material|pl',
          },
        ],
      },
    ]);

    const result = await prepareBaseExportMappingsAndProduct({
      data: {
        connectionId: 'conn-1',
        inventoryId: 'inv-1',
        templateId: 'tpl-v2',
      },
      imagesOnly: false,
      productId: 'product-1',
      resolvedInventoryId: 'inv-1',
      product: {
        id: 'product-1',
        categoryId: null,
        producers: [],
        tags: [],
        catalogs: [{ catalogId: 'catalog-1' }],
        parameters: [
          {
            parameterId: 'param-material',
            value: 'Wood',
            valuesByLanguage: { pl: 'Drewno' },
          },
        ],
      },
    });

    expect(result.mappings).toEqual([
      {
        sourceKey: 'text_fields.features.Material',
        targetField: 'parameter:param-material',
      },
      {
        sourceKey: 'text_fields.features|pl.Materiał',
        targetField: 'parameter:param-material|pl',
      },
    ]);
  });

  it('rejects templates that still use legacy parameter source mappings', async () => {
    listExportTemplatesMock.mockResolvedValue([
      {
        id: 'tpl-legacy',
        mappings: [
          {
            sourceKey: 'parameter:param-material',
            targetField: 'parameter:param-material',
          },
          {
            sourceKey: 'parameter:param-material|en',
            targetField: 'parameter:param-material|en',
          },
          {
            sourceKey: 'parameter:param-material|pl',
            targetField: 'parameter:param-material|pl',
          },
        ],
      },
    ]);

    await expect(
      prepareBaseExportMappingsAndProduct({
        data: {
          connectionId: 'conn-1',
          inventoryId: 'inv-1',
          templateId: 'tpl-legacy',
        },
        imagesOnly: false,
        productId: 'product-1',
        resolvedInventoryId: 'inv-1',
        product: {
          id: 'product-1',
          categoryId: null,
          producers: [],
          tags: [],
          catalogs: [{ catalogId: 'catalog-1' }],
          parameters: [{ parameterId: 'param-material', value: 'Wood' }],
        },
      })
    ).rejects.toThrow(
      'contains legacy parameter source mappings. Run "npm run migrate:base-export-template-parameter-sources:v2 -- --write" and retry.'
    );
  });
});
