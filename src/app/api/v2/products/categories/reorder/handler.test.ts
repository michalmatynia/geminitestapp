import { describe, expect, it } from 'vitest';

import { postHandler, reorderCategorySchema } from './handler';

describe('product categories reorder handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof reorderCategorySchema.safeParse).toBe('function');
  });
});
