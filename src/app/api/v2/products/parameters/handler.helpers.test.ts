import { describe, expect, it } from 'vitest';

import {
  normalizeFreshQueryValue,
  normalizeOptionLabels,
  resolveParametersQueryInput,
} from './handler.helpers';

describe('products/parameters handler helpers', () => {
  it('normalizes supported fresh query values', () => {
    expect(normalizeFreshQueryValue(true)).toBe(true);
    expect(normalizeFreshQueryValue(' yes ')).toBe(true);
    expect(normalizeFreshQueryValue('off')).toBe(false);
    expect(normalizeFreshQueryValue('')).toBeUndefined();
  });

  it('preserves unsupported fresh query values for schema rejection', () => {
    expect(normalizeFreshQueryValue('maybe')).toBe('maybe');
    expect(normalizeFreshQueryValue(1)).toBeUndefined();
  });

  it('merges request and context query input and deduplicates option labels', () => {
    const request = new Request(
      'http://localhost/api/v2/products/parameters?catalogId=url-catalog&fresh=true'
    );

    expect(
      resolveParametersQueryInput(request, {
        query: {
          fresh: false,
          extra: 'ctx-only',
        },
      } as never)
    ).toEqual({
      catalogId: 'url-catalog',
      fresh: false,
      extra: 'ctx-only',
    });

    expect(
      normalizeOptionLabels([' Size ', 'size', '', 'Color', 1, 'COLOR', 'Material'])
    ).toEqual(['Size', 'Color', 'Material']);
  });
});
