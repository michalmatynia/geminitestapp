import { describe, expect, it } from 'vitest';

import { deleteHandler, getHandler, putHandler, updateProfileSchema } from './handler';

describe('product-sync profile-by-id handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof putHandler).toBe('function');
    expect(typeof deleteHandler).toBe('function');
    expect(typeof updateProfileSchema.safeParse).toBe('function');
  });
});
