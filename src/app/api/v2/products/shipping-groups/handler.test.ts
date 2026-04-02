import { describe, expect, it } from 'vitest';

import {
  GET_handler,
  POST_handler,
  productShippingGroupCreateSchema,
  querySchema,
} from './handler';

describe('product shipping groups handler module', () => {
  it('exports the supported handlers and schemas', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
    expect(typeof productShippingGroupCreateSchema.safeParse).toBe('function');
  });
});
