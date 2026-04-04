import { describe, expect, it } from 'vitest';

import {
  buildDuplicateProductOptions,
  requireDuplicatedProduct,
  requireDuplicateProductId,
  resolveDuplicateProductSku,
} from './handler.helpers';

describe('products/[id]/duplicate handler helpers', () => {
  it('requires a trimmed product id', () => {
    expect(requireDuplicateProductId({ id: ' product-1 ' })).toBe('product-1');
    expect(() => requireDuplicateProductId({ id: '   ' })).toThrow('Product id is required');
  });

  it('normalizes duplicate sku and optional user context', () => {
    expect(resolveDuplicateProductSku('SKU-1')).toBe('SKU-1');
    expect(resolveDuplicateProductSku(undefined)).toBe('');
    expect(buildDuplicateProductOptions('user-1')).toEqual({ userId: 'user-1' });
    expect(buildDuplicateProductOptions(null)).toBeUndefined();
  });

  it('requires the duplicated product to exist', () => {
    expect(requireDuplicatedProduct({ id: 'product-dup-1' } as never, 'product-1')).toEqual({
      id: 'product-dup-1',
    });
    expect(() => requireDuplicatedProduct(null, 'missing-product')).toThrow('Product not found');
  });
});
