import { describe, expect, it } from 'vitest';

import { getAiPathRunStreamHandler, querySchema } from './handler';

describe('ai-paths run stream handler module', () => {
  it('exports the supported handlers and query schema', () => {
    expect(typeof getAiPathRunStreamHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });
});
