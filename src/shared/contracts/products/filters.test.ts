import { describe, expect, it } from 'vitest';

import { productFilterSchema } from '@/shared/contracts/products/filters';

describe('productFilterSchema pageSize clamp', () => {
  it('clamps pageSize values above 48', () => {
    const parsed = productFilterSchema.parse({ pageSize: '96' });
    expect(parsed.pageSize).toBe(48);
  });

  it('keeps valid pageSize values unchanged', () => {
    const parsed = productFilterSchema.parse({ pageSize: '24' });
    expect(parsed.pageSize).toBe(24);
  });
});
