import { describe, expect, it } from 'vitest';

import { DELETE_handler, PUT_handler, productShippingGroupUpdateSchema } from './handler';

describe('product shipping groups by-id handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof PUT_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
    expect(typeof productShippingGroupUpdateSchema.safeParse).toBe('function');
  });
});
