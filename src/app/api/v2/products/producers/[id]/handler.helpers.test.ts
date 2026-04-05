import { describe, expect, it } from 'vitest';

import {
  assertAvailableProducerName,
  buildProducerNameLookupInput,
  buildProducerUpdateInput,
  parseProducerId,
} from './handler.helpers';

describe('product producers by-id handler helpers', () => {
  it('parses route ids and rejects blank params', () => {
    expect(parseProducerId({ id: ' producer-1 ' })).toBe('producer-1');
    expect(() => parseProducerId({ id: '  ' })).toThrow('Invalid route parameters');
  });

  it('builds trimmed name lookups and duplicate-name rejections', () => {
    expect(
      buildProducerNameLookupInput({
        name: ' Priority ',
      })
    ).toEqual({
      name: 'Priority',
    });

    expect(() =>
      assertAvailableProducerName(
        { id: 'producer-2' },
        'producer-1',
        {
          name: 'Priority',
        }
      )
    ).toThrow('A producer with this name already exists');
  });

  it('builds partial update payloads and skips lookups for blank names', () => {
    expect(
      buildProducerUpdateInput({
        name: ' Priority ',
        website: null,
      })
    ).toEqual({
      name: 'Priority',
      website: null,
    });

    expect(buildProducerNameLookupInput({ name: '   ' })).toBeNull();
  });
});
