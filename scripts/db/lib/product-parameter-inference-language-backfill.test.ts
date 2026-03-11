import { describe, expect, it } from 'vitest';

import { backfillProductParameterLanguageValues } from './product-parameter-inference-language-backfill';

describe('backfillProductParameterLanguageValues', () => {
  it('adds English localized values from the scalar parameter value when sibling locales exist', () => {
    const result = backfillProductParameterLanguageValues({
      parameters: [
        {
          parameterId: 'material',
          value: 'Faux Leather',
          valuesByLanguage: {
            pl: 'Sztuczna skora',
          },
        },
      ],
      languageCode: 'en',
    });

    expect(result).toEqual({
      changed: true,
      repairedCount: 1,
      repairedParameterIds: ['material'],
      nextParameters: [
        {
          parameterId: 'material',
          value: 'Faux Leather',
          valuesByLanguage: {
            pl: 'Sztuczna skora',
            en: 'Faux Leather',
          },
        },
      ],
    });
  });

  it('skips rows that already have the target language or no localized siblings', () => {
    const result = backfillProductParameterLanguageValues({
      parameters: [
        {
          parameterId: 'material',
          value: 'Faux Leather',
          valuesByLanguage: {
            EN: 'Faux Leather',
            pl: 'Sztuczna skora',
          },
        },
        {
          parameterId: 'size',
          value: 'XL',
        },
      ],
      languageCode: 'en',
    });

    expect(result.changed).toBe(false);
    expect(result.repairedCount).toBe(0);
    expect(result.repairedParameterIds).toEqual([]);
    expect(result.nextParameters).toEqual([
      {
        parameterId: 'material',
        value: 'Faux Leather',
        valuesByLanguage: {
          EN: 'Faux Leather',
          pl: 'Sztuczna skora',
        },
      },
      {
        parameterId: 'size',
        value: 'XL',
      },
    ]);
  });

  it('repairs only eligible rows and leaves non-object entries untouched', () => {
    const result = backfillProductParameterLanguageValues({
      parameters: [
        null,
        {
          parameterId: 'color',
          value: 'Black|Red',
          valuesByLanguage: {
            pl: 'Czarny|Czerwony',
          },
        },
        {
          parameterId: 'brand',
          value: '',
          valuesByLanguage: {
            pl: 'Marka',
          },
        },
      ],
    });

    expect(result.changed).toBe(true);
    expect(result.repairedCount).toBe(1);
    expect(result.repairedParameterIds).toEqual(['color']);
    expect(result.nextParameters).toEqual([
      null,
      {
        parameterId: 'color',
        value: 'Black|Red',
        valuesByLanguage: {
          pl: 'Czarny|Czerwony',
          en: 'Black|Red',
        },
      },
      {
        parameterId: 'brand',
        value: '',
        valuesByLanguage: {
          pl: 'Marka',
        },
      },
    ]);
  });
});
