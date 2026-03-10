import { describe, expect, it } from 'vitest';

import { GET_handler, POST_handler, querySchema } from './handler';

describe('agentcreator teaching collection documents handler module', () => {
  it('exports the supported handlers and query schema', () => {
    expect(typeof GET_handler).toBe('function');
    expect(typeof POST_handler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });
});
