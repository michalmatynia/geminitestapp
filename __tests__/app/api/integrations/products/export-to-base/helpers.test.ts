import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listExportTemplatesMock, getParameterByIdMock } = vi.hoisted(() => ({
  listExportTemplatesMock: vi.fn(),
  getParameterByIdMock: vi.fn(),
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
  getParameterRepository: vi.fn(async () => ({
    getParameterById: getParameterByIdMock,
    listParameters: vi.fn(async () => [
      { id: 'param-material', name_en: 'Material', name_pl: 'Materiał' },
      { id: 'param-color', name_en: 'Color', name_pl: 'Kolor' },
    ]),
  })),
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

import {
  parseMappedParameterId,
  prepareBaseExportMappingsAndProduct,
} from '@/app/api/integrations/products/[id]/export-to-base/segments/preparation';

describe('parseMappedParameterId', () => {
  beforeEach(() => {
    listExportTemplatesMock.mockReset();
    getParameterByIdMock.mockReset();
  });

  it('parses basic parameter mappings', () => {
    expect(parseMappedParameterId('parameter:param-material')).toBe('param-material');
  });

  it('parses translated parameter mappings with language suffix', () => {
    expect(parseMappedParameterId('parameter:param-material|en')).toBe('param-material');
    expect(parseMappedParameterId('parameter:param-material|de')).toBe('param-material');
  });

  it('returns empty for non-parameter mappings', () => {
    expect(parseMappedParameterId('name')).toBe('');
    expect(parseMappedParameterId('')).toBe('');
    expect(parseMappedParameterId(undefined)).toBe('');
  });

  it('normalizes legacy parameter source mappings to Base text_fields.features keys', async () => {
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
    getParameterByIdMock.mockResolvedValue({
      id: 'param-material',
      name_en: 'Material',
      name_pl: 'Materiał',
      name_de: null,
    });

    const result = await prepareBaseExportMappingsAndProduct({
      data: {
        connectionId: 'conn-1',
        inventoryId: 'inv-1',
        templateId: 'tpl-legacy',
      },
      imagesOnly: false,
      productId: 'product-1',
      resolvedInventoryId: 'inv-1',
      product: {
        categoryId: null,
        producers: [],
        tags: [],
        catalogs: [
          {
            catalogId: 'catalog-1',
            catalog: {
              defaultLanguageId: 'EN',
            },
          },
        ],
        parameters: [
          {
            parameterId: 'param-material',
            value: 'Wood',
            valuesByLanguage: {
              pl: 'Drewno',
            },
          },
        ],
      },
    });

    expect(result.mappings).toEqual(
      expect.arrayContaining([
        {
          sourceKey: 'text_fields.features.Material',
          targetField: 'parameter:param-material',
        },
        {
          sourceKey: 'text_fields.features|en.Material',
          targetField: 'parameter:param-material|en',
        },
        {
          sourceKey: 'text_fields.features|pl.Materiał',
          targetField: 'parameter:param-material|pl',
        },
      ])
    );
  });
});
