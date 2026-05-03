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

  it('allows larger pageSize values for explicit product id filters', () => {
    const parsed = productFilterSchema.parse({
      ids: 'product-1,product-2',
      pageSize: '96',
    });

    expect(parsed.pageSize).toBe(96);
  });

  it('clamps explicit product id filter pageSize values to the id-filter limit', () => {
    const parsed = productFilterSchema.parse({
      ids: 'product-1,product-2',
      pageSize: '999',
    });

    expect(parsed.pageSize).toBe(500);
  });

  it('parses archived boolean filters from querystring input', () => {
    expect(productFilterSchema.parse({ archived: 'true' }).archived).toBe(true);
    expect(productFilterSchema.parse({ archived: 'false' }).archived).toBe(false);
  });

  it('parses product id filters from comma-separated querystring input', () => {
    const parsed = productFilterSchema.parse({
      ids: ' product-1,product-2,product-1 ,, ',
    });

    expect(parsed.ids).toEqual(['product-1', 'product-2']);
  });
});
