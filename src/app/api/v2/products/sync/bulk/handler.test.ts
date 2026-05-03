import { describe, expect, it } from 'vitest';

import { postHandler, bulkSchema } from './handler';

describe('product-sync bulk handler module', () => {
  it('exports the supported handlers and schema', () => {
    expect(typeof postHandler).toBe('function');
    expect(typeof bulkSchema.safeParse).toBe('function');
  });

  it('rejects empty productIds', () => {
    const result = bulkSchema.safeParse({ productIds: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 500 productIds', () => {
    const result = bulkSchema.safeParse({
      productIds: Array.from({ length: 501 }, (_, i) => `p${i}`),
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid payload', () => {
    const result = bulkSchema.safeParse({ productIds: ['p1', 'p2'] });
    expect(result.success).toBe(true);
  });
});
