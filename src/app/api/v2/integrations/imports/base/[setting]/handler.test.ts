import { describe, expect, it } from 'vitest';

import { getHandler, postHandler, querySchema } from './handler';

describe('base import setting handler module', () => {
  it('exports the supported handlers and query schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof postHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });
});
