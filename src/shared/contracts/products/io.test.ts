import { describe, expect, it } from 'vitest';

import { productCreateInputSchema, productUpdateInputSchema } from './io';

describe('product io schemas', () => {
  it('normalizes numeric form fields on create payloads', () => {
    const parsed = productCreateInputSchema.parse({
      sku: 'SKU-1',
      price: ' 12.5 ',
      stock: '7',
    });

    expect(parsed.price).toBe(12.5);
    expect(parsed.stock).toBe(7);
  });

  it('treats empty and NaN-like numeric values as undefined', () => {
    const parsed = productCreateInputSchema.parse({
      sku: 'SKU-1',
      price: 'NaN',
      stock: '',
    });

    expect(parsed.price).toBeUndefined();
    expect(parsed.stock).toBeUndefined();
  });

  it('normalizes blank update skus to null', () => {
    const parsed = productUpdateInputSchema.parse({
      sku: '   ',
    });

    expect(parsed.sku).toBeNull();
  });
});
