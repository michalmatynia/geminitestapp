import { describe, expect, it } from 'vitest';

import {
  productBulkImagesBase64ResponseSchema,
  productDuplicateRequestSchema,
  productImageBase64ResponseSchema,
  productPatchInputSchema,
} from '@/shared/contracts/products';

describe('product action contract runtime', () => {
  it('parses product action request payloads', () => {
    expect(
      productDuplicateRequestSchema.parse({
        sku: ' DUP-SKU ',
      }).sku
    ).toBe('DUP-SKU');

    expect(
      productPatchInputSchema.parse({
        price: 19.99,
        stock: 5,
      }).stock
    ).toBe(5);
  });

  it('parses product image base64 response envelopes', () => {
    expect(
      productImageBase64ResponseSchema.parse({
        status: 'ok',
        productId: 'product-1',
        count: 3,
      }).productId
    ).toBe('product-1');

    expect(
      productBulkImagesBase64ResponseSchema.parse({
        status: 'ok',
        requested: 4,
        succeeded: 3,
        failed: 1,
      }).failed
    ).toBe(1);
  });
});
