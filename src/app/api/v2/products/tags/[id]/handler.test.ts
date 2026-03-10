import { describe, expect, it } from 'vitest';

import { DELETE_handler, PUT_handler, productTagUpdateSchema } from './handler';

describe('product tags by-id handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof PUT_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
    expect(typeof productTagUpdateSchema.safeParse).toBe('function');
  });
});
