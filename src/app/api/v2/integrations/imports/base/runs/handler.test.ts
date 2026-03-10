import { describe, expect, it } from 'vitest';

import { GET_handler, POST_handler, listRunsQuerySchema, startRunSchema } from './handler';

describe('base import runs handler module', () => {
  it('exports the supported handlers and schemas', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
    expect(typeof listRunsQuerySchema.safeParse).toBe('function');
    expect(typeof startRunSchema.safeParse).toBe('function');
  });
});
