import { describe, expect, it } from 'vitest';

import {
  buildProductImageBase64Response,
  requireProductImageBase64Product,
  requireProductImageBase64ProductId,
} from './handler.helpers';

describe('product image base64 handler helpers', () => {
  it('requires a trimmed product id', () => {
    expect(requireProductImageBase64ProductId({ id: ' product-1 ' })).toBe('product-1');
    expect(() => requireProductImageBase64ProductId({ id: '   ' })).toThrow(
      'Invalid route parameters'
    );
  });

  it('requires the product to exist', () => {
    expect(requireProductImageBase64Product({ id: 'product-1' } as never, 'product-1')).toEqual({
      id: 'product-1',
    });
    expect(() => requireProductImageBase64Product(null, 'missing-product')).toThrow(
      'Product not found'
    );
  });

  it('builds the counted image base64 response', () => {
    expect(
      buildProductImageBase64Response('product-1', ['data:a', null, undefined, 'data:b'])
    ).toEqual({
      status: 'ok',
      productId: 'product-1',
      count: 2,
    });
  });
});
