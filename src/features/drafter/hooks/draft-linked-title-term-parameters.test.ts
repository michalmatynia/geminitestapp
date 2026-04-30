import { describe, expect, it } from 'vitest';

import type { ProductParameter } from '@/shared/contracts/products/parameters';
import type { ProductTitleTerm } from '@/shared/contracts/products/title-terms';

import { resolveDraftLinkedTitleTermParameterValues } from './draft-linked-title-term-parameters';

const createParameter = (
  id: string,
  linkedTitleTermType: ProductParameter['linkedTitleTermType']
): ProductParameter => ({
  id,
  catalogId: 'catalog-1',
  name: id,
  name_en: id,
  name_pl: null,
  name_de: null,
  selectorType: 'text',
  optionLabels: [],
  linkedTitleTermType,
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
});

const createTerm = (
  id: string,
  type: ProductTitleTerm['type'],
  name_en: string,
  name_pl: string | null = null
): ProductTitleTerm => ({
  id,
  type,
  catalogId: 'catalog-1',
  name_en,
  name_pl,
  createdAt: '2026-04-30T00:00:00.000Z',
  updatedAt: '2026-04-30T00:00:00.000Z',
});

describe('resolveDraftLinkedTitleTermParameterValues', () => {
  it('maps linked size, material, and theme parameters from a structured draft title', () => {
    const result = resolveDraftLinkedTitleTermParameterValues({
      existingParameterValues: [{ parameterId: 'manual', value: 'Keep me' }],
      parameters: [
        createParameter('manual', null),
        createParameter('size-param', 'size'),
        createParameter('material-param', 'material'),
        createParameter('theme-param', 'theme'),
      ],
      nameEn: 'Scout Regiment | 4 cm | Metal | Anime Pin | Attack On Titan',
      sizeTerms: [createTerm('term-size', 'size', '4 cm')],
      materialTerms: [createTerm('term-material', 'material', 'Metal', 'Metal PL')],
      themeTerms: [createTerm('term-theme', 'theme', 'Attack On Titan')],
    });

    expect(result).toEqual([
      { parameterId: 'manual', value: 'Keep me' },
      {
        parameterId: 'size-param',
        value: '4 cm',
        valuesByLanguage: { en: '4 cm', pl: '4 cm' },
      },
      {
        parameterId: 'material-param',
        value: 'Metal',
        valuesByLanguage: { en: 'Metal', pl: 'Metal PL' },
      },
      {
        parameterId: 'theme-param',
        value: 'Attack On Titan',
        valuesByLanguage: { en: 'Attack On Titan', pl: 'Attack On Titan' },
      },
    ]);
  });

  it('keeps skipped linked parameters manual and removes stale generated values', () => {
    const result = resolveDraftLinkedTitleTermParameterValues({
      existingParameterValues: [
        { parameterId: 'size-param', value: 'Manual size', skipParameterInference: true },
        { parameterId: 'material-param', value: 'Old material' },
      ],
      parameters: [
        createParameter('size-param', 'size'),
        createParameter('material-param', 'material'),
      ],
      nameEn: 'Scout Regiment | 4 cm | Resin | Anime Pin | Attack On Titan',
      sizeTerms: [createTerm('term-size', 'size', '4 cm')],
      materialTerms: [createTerm('term-resin', 'material', 'Resin')],
      themeTerms: [],
    });

    expect(result).toEqual([
      { parameterId: 'size-param', value: 'Manual size', skipParameterInference: true },
      {
        parameterId: 'material-param',
        value: 'Resin',
        valuesByLanguage: { en: 'Resin', pl: 'Resin' },
      },
    ]);
  });
});
