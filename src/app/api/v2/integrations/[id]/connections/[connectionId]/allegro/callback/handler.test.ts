import { describe, expect, it } from 'vitest';

import { GET_handler, querySchema } from './handler';

describe('integration allegro callback handler module', () => {
  it('exports the supported handlers and query schema', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });
});
