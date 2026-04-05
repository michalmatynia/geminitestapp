import { describe, expect, it } from 'vitest';

import type { ProductParameterValue } from '@/shared/contracts/products/product';
import { PRODUCT_SIMPLE_PARAMETER_ID_PREFIX } from '@/shared/contracts/products/base';

import { normalizeProductParametersForSubmission } from './useProductFormSubmit';

describe('normalizeProductParametersForSubmission', () => {
  it('does not fall back to another locale when a stale direct value no longer matches', () => {
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
        value: '',
        valuesByLanguage: {
          pl: 'Uzywany',
        },
      },
    ]);
  });

  it('merges duplicate localized entries by parameter id instead of replacing siblings', () => {
    const input: ProductParameterValue[] = [
      {
        parameterId: 'condition',
        value: 'Nowy',
        valuesByLanguage: {
          en: 'Nowy',
        },
      },
      {
        parameterId: 'condition',
        value: '',
        valuesByLanguage: {
          pl: 'Uzywany',
        },
      },
    ];

    expect(normalizeProductParametersForSubmission(input)).toEqual([
      {
        parameterId: 'condition',
        value: 'Nowy',
        valuesByLanguage: {
          en: 'Nowy',
          pl: 'Uzywany',
        },
      },
    ]);
  });

  it('keeps the parameter with an empty value when all localized values are cleared', () => {
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

  it('lets a later empty duplicate clear an earlier stale value without removing the parameter', () => {
    const input: ProductParameterValue[] = [
      {
        parameterId: 'condition',
        value: 'Used',
      },
      {
        parameterId: 'condition',
        value: '   ',
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
