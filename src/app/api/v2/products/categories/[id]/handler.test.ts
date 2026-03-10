import { describe, expect, it } from 'vitest';

import { DELETE_handler, GET_handler, PUT_handler, productCategoryUpdateSchema } from './handler';

describe('product categories by-id handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof PUT_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
    expect(typeof productCategoryUpdateSchema.safeParse).toBe('function');
  });
});
