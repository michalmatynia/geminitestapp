import { describe, expect, it } from 'vitest';

import { postHandler, reorderPayloadSchema } from './handler';

describe('validator-patterns reorder handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof reorderPayloadSchema.safeParse).toBe('function');
  });
});
