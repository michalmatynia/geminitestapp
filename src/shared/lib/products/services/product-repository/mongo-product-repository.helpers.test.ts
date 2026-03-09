import { describe, expect, it } from 'vitest';

import { normalizeProductParameterValues } from './mongo-product-repository.helpers';

describe('mongo normalizeProductParameterValues', () => {
  it('merges localized values by parameter id instead of replacing sibling locales', () => {
    const normalized = normalizeProductParameterValues([
      {
        parameterId: 'condition',
        value: 'Nowy',
        valuesByLanguage: { en: 'Nowy' },
      },
      {
        parameterId: 'condition',
        value: '',
        valuesByLanguage: { pl: 'Uzywany' },
      },
    ]);

    expect(normalized).toEqual([
      {
        parameterId: 'condition',
        value: 'Nowy',
        valuesByLanguage: { en: 'Nowy', pl: 'Uzywany' },
      },
    ]);
  });

  it('drops a stale direct value when it no longer matches any localized entry', () => {
    const normalized = normalizeProductParameterValues([
      {
        parameterId: 'condition',
        value: 'Nowy',
        valuesByLanguage: { pl: 'Uzywany' },
      },
    ]);

    expect(normalized).toEqual([
      {
        parameterId: 'condition',
        value: '',
        valuesByLanguage: { pl: 'Uzywany' },
      },
    ]);
  });

  it('keeps the parameter with an empty value when latest duplicate entry clears every value', () => {
    const normalized = normalizeProductParameterValues([
      {
        parameterId: 'name',
        value: 'Nowy',
        valuesByLanguage: { en: 'Nowy' },
      },
      {
        parameterId: 'name',
        value: '',
      },
    ]);

    expect(normalized).toEqual([
      {
        parameterId: 'name',
        value: '',
      },
    ]);
  });
});
