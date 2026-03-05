import { describe, expect, it } from 'vitest';

import type { ProductParameterValue } from '@/shared/contracts/products';
import { PRODUCT_SIMPLE_PARAMETER_ID_PREFIX } from '@/shared/contracts/products';

import { normalizeProductParametersForSubmission } from './useProductFormSubmit';

describe('normalizeProductParametersForSubmission', () => {
  it('prefers localized values over stale direct value when localized map exists', () => {
    const input: ProductParameterValue[] = [
      {
        parameterId: 'condition',
        value: 'Nowy',
        valuesByLanguage: {
          en: ' ',
          pl: 'Uzywany',
        },
      },
    ];

    expect(normalizeProductParametersForSubmission(input)).toEqual([
      {
        parameterId: 'condition',
        value: 'Uzywany',
        valuesByLanguage: {
          pl: 'Uzywany',
        },
      },
    ]);
  });

  it('keeps empty value when all localized values are cleared', () => {
    const input: ProductParameterValue[] = [
      {
        parameterId: 'condition',
        value: '',
        valuesByLanguage: {
          en: ' ',
          pl: '',
        },
      },
    ];

    expect(normalizeProductParametersForSubmission(input)).toEqual([
      {
        parameterId: 'condition',
        value: '',
      },
    ]);
  });

  it('decodes prefixed parameter ids and drops empty ids', () => {
    const input: ProductParameterValue[] = [
      {
        parameterId: `${PRODUCT_SIMPLE_PARAMETER_ID_PREFIX}condition`,
        value: 'Used',
      },
      {
        parameterId: '  ',
        value: 'ignored',
      },
    ];

    expect(normalizeProductParametersForSubmission(input)).toEqual([
      {
        parameterId: 'condition',
        value: 'Used',
      },
    ]);
  });
});
