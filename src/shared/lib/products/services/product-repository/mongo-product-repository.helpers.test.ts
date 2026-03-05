import { describe, expect, it } from 'vitest';

import { normalizeProductParameterValues } from './mongo-product-repository.helpers';

describe('mongo normalizeProductParameterValues', () => {
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
});
