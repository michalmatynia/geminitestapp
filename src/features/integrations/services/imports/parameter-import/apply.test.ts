import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getCatalogParameterLinksMock: vi.fn(),
  mergeCatalogParameterLinksMock: vi.fn(),
}));

vi.mock('./link-map-repository', () => ({
  getCatalogParameterLinks: (...args: unknown[]) => mocks.getCatalogParameterLinksMock(...args),
  mergeCatalogParameterLinks: (...args: unknown[]) =>
    mocks.mergeCatalogParameterLinksMock(...args),
}));

import { applyBaseParameterImport } from './apply';

describe('applyBaseParameterImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCatalogParameterLinksMock.mockResolvedValue({});
    mocks.mergeCatalogParameterLinksMock.mockResolvedValue(undefined);
  });

  it('never overwrites a linked title-term parameter with imported static values', async () => {
    const result = await applyBaseParameterImport({
      settings: {
        enabled: true,
        mode: 'all',
        languageScope: 'catalog_languages',
        createMissingParameters: false,
        overwriteExistingValues: true,
        matchBy: 'name_only',
      },
      record: {
        parameters: [{ name: 'Material', value: 'Plastic' }],
      },
      templateMappings: [],
      existingValues: [
        {
          parameterId: 'param-material',
          value: 'Metal',
          valuesByLanguage: {
            en: 'Metal',
            pl: 'Metal PL',
          },
        },
      ],
      catalogId: 'catalog-1',
      catalogLanguageCodes: ['en', 'pl'],
      defaultLanguageCode: 'en',
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
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z',
        },
      ],
      parameterRepository: {
        listParameters: vi.fn().mockResolvedValue([]),
        createParameter: vi.fn(),
      },
    });

    expect(result).toEqual({
      applied: true,
      parameters: [
        {
          parameterId: 'param-material',
          value: 'Metal',
          valuesByLanguage: {
            en: 'Metal',
            pl: 'Metal PL',
          },
        },
      ],
      summary: {
        extracted: 1,
        resolved: 1,
        created: 0,
        written: 0,
      },
    });
  });
});
