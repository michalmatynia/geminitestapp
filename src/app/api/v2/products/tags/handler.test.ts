import { describe, expect, it } from 'vitest';

import { getHandler, postHandler, productTagCreateSchema, querySchema } from './handler';

describe('product tags handler module', () => {
  it('exports the supported handlers and schemas', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof postHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
    expect(typeof productTagCreateSchema.safeParse).toBe('function');
  });
});
