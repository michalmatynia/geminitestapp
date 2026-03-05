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

  it('allows clearing stale localized values when latest duplicate entry omits language map', () => {
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
