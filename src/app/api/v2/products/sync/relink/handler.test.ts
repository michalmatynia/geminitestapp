import { describe, expect, it } from 'vitest';

import { postHandler, relinkSchema } from './handler';

describe('product-sync relink handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof relinkSchema.safeParse).toBe('function');
  });
});
