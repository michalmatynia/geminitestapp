import { describe, expect, it } from 'vitest';

import { deleteHandler, putHandler, productTagUpdateSchema } from './handler';

describe('product tags by-id handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof putHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
    expect(typeof productTagUpdateSchema.safeParse).toBe('function');
  });
});
