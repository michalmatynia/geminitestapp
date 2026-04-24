import { describe, expect, it } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductParameter } from '@/shared/contracts/products/parameters';

import { buildParameterValueInferenceTriggerInput } from './buildParameterValueInferenceTriggerInput';

describe('buildParameterValueInferenceTriggerInput', () => {
  it('builds a row-scoped parameter value inference payload from product copy and images', () => {
    const parameter = {
      id: 'condition',
      catalogId: 'catalog-1',
      name_en: 'Condition',
      name_pl: 'Stan',
      name_de: null,
      selectorType: 'select',
      optionLabels: ['New', 'Used'],
      linkedTitleTermType: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    } as ProductParameter;

    const result = buildParameterValueInferenceTriggerInput({
      values: {
        name_en: 'Soft plush keychain',
        name_pl: 'Miekki brelok pluszowy',
        description_en: 'Small plush keychain with metal ring.',
      } as ProductFormData & Record<string, unknown>,
      imageLinks: ['https://example.test/keychain.jpg'],
      row: {
        index: 2,
        parameter,
        languageCode: 'pl',
        languageLabel: 'Polish',
        currentValue: 'Used',
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        product: expect.objectContaining({
          title: 'Miekki brelok pluszowy',
          description: 'Small plush keychain with metal ring.',
          imageLinks: ['https://example.test/keychain.jpg'],
        }),
        targetParameter: expect.objectContaining({
          id: 'condition',
          rowIndex: 2,
          languageCode: 'pl',
          languageLabel: 'Polish',
          selectorType: 'select',
          name: 'Stan',
          optionLabels: ['New', 'Used'],
          currentValue: 'Used',
        }),
        currentValue: 'Used',
      })
    );
  });
});
