import { describe, expect, it } from 'vitest';

import {
  assertAvailableProducerCreateName,
  buildProducerCreateInput,
  buildProducerCreateNameLookupInput,
} from './handler.helpers';

describe('product producers handler helpers', () => {
  it('builds trimmed producer create-name lookups', () => {
    expect(
      buildProducerCreateNameLookupInput({
        name: ' Priority ',
        website: null,
      })
    ).toEqual({
      name: 'Priority',
    });
  });

  it('rejects duplicate producer names', () => {
    expect(() =>
      assertAvailableProducerCreateName(
        { id: 'producer-2' },
        {
          name: 'Priority',
        }
      )
    ).toThrow('A producer with this name already exists');
  });

  it('builds create payloads with nullable website fallback', () => {
    expect(
      buildProducerCreateInput({
        name: ' Priority ',
        website: undefined,
      })
    ).toEqual({
      name: 'Priority',
      website: null,
    });
  });
});
