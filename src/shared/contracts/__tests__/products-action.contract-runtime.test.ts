import { describe, expect, it } from 'vitest';

import {
  createProductCategorySchema,
  productBulkImagesBase64ResponseSchema,
  productCsvImportResponseSchema,
  productDuplicateRequestSchema,
  productImageBase64ResponseSchema,
  productPatchInputSchema,
  updateProductCategorySchema,
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

  it('parses product csv import responses', () => {
    expect(
      productCsvImportResponseSchema.parse({
        message: 'CSV import completed',
        summary: {
          total: 12,
          successful: 10,
          failed: 2,
          errors: [{ sku: 'SKU-1', error: 'Invalid price' }],
        },
      }).summary.failed
    ).toBe(2);
  });

  it('parses shared product category create and update payloads', () => {
    expect(
      createProductCategorySchema.parse({
        name: 'Primary',
        catalogId: 'catalog-1',
        parentId: null,
      }).catalogId
    ).toBe('catalog-1');

    expect(
      updateProductCategorySchema.parse({
        name: 'Renamed',
        sortIndex: 4,
      }).sortIndex
    ).toBe(4);
  });
});
