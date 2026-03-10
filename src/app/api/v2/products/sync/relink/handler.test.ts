import { describe, expect, it } from 'vitest';

import { POST_handler, relinkSchema } from './handler';

describe('product-sync relink handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof relinkSchema.safeParse).toBe('function');
  });
});
