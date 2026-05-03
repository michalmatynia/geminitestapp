import { describe, expect, it } from 'vitest';

import { getHandler, postHandler, productCategoryCreateSchema, querySchema } from './handler';

describe('product categories handler module', () => {
  it('exports the supported handlers and schemas', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof postHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
    expect(typeof productCategoryCreateSchema.safeParse).toBe('function');
  });
});
