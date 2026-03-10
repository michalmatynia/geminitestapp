import { describe, expect, it } from 'vitest';

import { GET_handler, POST_handler, productTagCreateSchema, querySchema } from './handler';

describe('product tags handler module', () => {
  it('exports the supported handlers and schemas', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
    expect(typeof productTagCreateSchema.safeParse).toBe('function');
  });
});
