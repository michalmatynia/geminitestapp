import { describe, expect, it } from 'vitest';

import { GET_handler, POST_handler, createProfileSchema } from './handler';

describe('product-sync profiles handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
    expect(typeof createProfileSchema.safeParse).toBe('function');
  });
});
