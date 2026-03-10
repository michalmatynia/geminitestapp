import { describe, expect, it } from 'vitest';

import { POST_handler, reorderCategorySchema } from './handler';

describe('product categories reorder handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof reorderCategorySchema.safeParse).toBe('function');
  });
});
