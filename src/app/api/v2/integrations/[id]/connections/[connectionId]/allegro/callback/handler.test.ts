import { describe, expect, it } from 'vitest';

import { getHandler, querySchema } from './handler';

describe('integration allegro callback handler module', () => {
  it('exports the supported handlers and query schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });
});
