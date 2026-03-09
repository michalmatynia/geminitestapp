import { describe, expect, it } from 'vitest';

import { normalizeProductParameterValues } from './prisma-product-repository.helpers';

describe('prisma normalizeProductParameterValues', () => {
  it('uses latest localized values and does not preserve stale earlier direct value', () => {
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
        value: 'Uzywany',
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
