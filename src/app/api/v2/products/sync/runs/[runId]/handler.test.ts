import { describe, expect, it } from 'vitest';

import { getHandler, querySchema } from './handler';

describe('product-sync run-by-id handler module', () => {
  it('exports the supported handlers and query schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });
});
