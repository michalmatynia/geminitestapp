import { describe, expect, it } from 'vitest';

import {
  collectParameterKeys,
  getBaseImportParametersHandler,
  postBaseImportParametersHandler,
} from './handler';

describe('base import parameters handler module', () => {
  it('exports the supported handlers', () => {
    expect(typeof getBaseImportParametersHandler).toBe('function');
    expect(typeof postBaseImportParametersHandler).toBe('function');
  });

  it('adds normalized marketplace checkbox keys from grouped Base source buckets', () => {
    const collected = collectParameterKeys({
      product_id: 'p1',
      parameters: [
        {
          name: 'Disabled Sales Channels',
          values: [
            { label: 'Tradera', selected: true },
            { label: 'Shpock', selected: true },
            { label: 'Vinted', selected: false },
          ],
        },
      ],
    });

    expect(collected.keys).toEqual(expect.arrayContaining(['Tradera', 'Schpock', 'Vinted']));
    expect(collected.values).toMatchObject({
      Tradera: 'true',
      Schpock: 'true',
      Vinted: 'false',
    });
  });

  it('adds canonical marketplace checkbox keys for "X Yes" style Base fields', () => {
    const collected = collectParameterKeys({
      product_id: 'p1',
      text_fields: {
        'Tradera Yes': '1',
        'Shpock Yes': '0',
      },
    });

    expect(collected.keys).toEqual(expect.arrayContaining(['Tradera', 'Schpock']));
    expect(collected.values).toMatchObject({
      Tradera: 'true',
      Schpock: 'false',
    });
  });
});
