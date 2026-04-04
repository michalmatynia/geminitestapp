import { describe, expect, it } from 'vitest';

import { buildProductSyncRunDetailOptions, querySchema } from './handler.helpers';

describe('product-sync run-by-id handler helpers', () => {
  it('parses includeItems from query schema', () => {
    expect(querySchema.parse({ includeItems: 'true' })).toEqual({
      includeItems: true,
    });
    expect(querySchema.parse({ includeItems: 'false' })).toEqual({
      includeItems: false,
    });
  });

  it('builds detail options with only defined fields', () => {
    expect(
      buildProductSyncRunDetailOptions({
        page: 2,
        pageSize: 50,
        includeItems: true,
      })
    ).toEqual({
      page: 2,
      pageSize: 50,
      includeItems: true,
    });

    expect(buildProductSyncRunDetailOptions({ page: undefined, includeItems: false })).toEqual({
      includeItems: false,
    });
    expect(buildProductSyncRunDetailOptions(undefined)).toEqual({});
  });
});
