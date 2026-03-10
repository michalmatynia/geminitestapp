import { describe, expect, it } from 'vitest';

import { POST_handler, reorderPayloadSchema } from './handler';

describe('validator-patterns reorder handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof reorderPayloadSchema.safeParse).toBe('function');
  });
});
