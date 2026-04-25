import { describe, expect, it } from 'vitest';

import type {
  ProductParameter,
  ProductSimpleParameter,
} from '@/shared/contracts/products/parameters';

import { mergeParameterDefinitions } from './ProductFormParameterDefinitions';

describe('mergeParameterDefinitions', () => {
  it('adds legacy simple parameters and keeps canonical product parameters authoritative', () => {
    const canonicalParameter = {
      id: 'condition',
      name: 'Canonical Condition',
      name_en: 'Canonical Condition',
      name_pl: null,
      name_de: null,
      catalogId: 'catalog-1',
      selectorType: 'text',
      optionLabels: [],
      linkedTitleTermType: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } satisfies ProductParameter;

    const merged = mergeParameterDefinitions({
      parameters: [canonicalParameter],
      simpleParameters: [
        {
          id: 'condition',
          catalogId: 'catalog-1',
          name_en: 'Legacy Condition',
        },
        {
          id: 'material',
          catalogId: 'catalog-1',
          name_en: 'Material',
          options: [' Metal ', 'metal', 'Plastic'],
        },
      ] satisfies ProductSimpleParameter[],
      fallbackCatalogId: 'catalog-1',
    });

    expect(merged).toEqual([
      canonicalParameter,
      expect.objectContaining({
        id: 'material',
        name_en: 'Material',
        selectorType: 'text',
        optionLabels: ['Metal', 'Plastic'],
      }),
    ]);
  });

  it('adds fallback definitions from saved parameter values when metadata is missing', () => {
    const merged = mergeParameterDefinitions({
      parameters: [],
      simpleParameters: [],
      parameterValues: [
        {
          parameterId: 'legacy_condition',
          value: 'Used',
        },
      ],
      fallbackCatalogId: 'catalog-1',
    });

    expect(merged).toEqual([
      expect.objectContaining({
        id: 'legacy_condition',
        name_en: 'Legacy Condition',
        selectorType: 'text',
        optionLabels: [],
      }),
    ]);
  });
});
