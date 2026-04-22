import { describe, expect, it } from 'vitest';

import { getHandler, postHandler, createProfileSchema } from './handler';

describe('product-sync profiles handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof postHandler).toBe('function');
    expect(typeof createProfileSchema.safeParse).toBe('function');
  });
});
