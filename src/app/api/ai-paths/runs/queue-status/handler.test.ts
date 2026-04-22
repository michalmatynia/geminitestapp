import { describe, expect, it } from 'vitest';

import { getHandler, __testOnly, querySchema } from './handler';

describe('ai-paths run queue-status handler module', () => {
  it('exports the supported handlers and helpers', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
    expect(typeof __testOnly.clearQueueStatusCache).toBe('function');
  });
});
