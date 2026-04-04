import { describe, expect, it } from 'vitest';

import {
  attachProductsByIdTimingHeaders,
  buildProductsByIdMutationOptions,
  buildProductsByIdPatchUpdateData,
  buildProductsByIdPayload,
  buildProductsByIdServerTiming,
  isLikelyProductsByIdPayloadTooLarge,
} from './handler.helpers';

describe('products/[id] handler helpers', () => {
  it('builds timing headers from finite timing entries', () => {
    expect(
      buildProductsByIdServerTiming({
        formData: 12.4,
        validation: 3.2,
        ignored: null,
      })
    ).toBe('formData;dur=12, validation;dur=3');

    const response = new Response(null);
    attachProductsByIdTimingHeaders(response, {
      formData: 12.4,
      validation: 3.2,
    });
    expect(response.headers.get('Server-Timing')).toBe('formData;dur=12, validation;dur=3');
  });

  it('detects likely oversized payload errors', () => {
    expect(
      isLikelyProductsByIdPayloadTooLarge(new Error('Request entity too large for proxy'))
    ).toBe(true);
    expect(isLikelyProductsByIdPayloadTooLarge(new Error('body limit exceeded'))).toBe(true);
    expect(isLikelyProductsByIdPayloadTooLarge(new Error('unexpected parse failure'))).toBe(false);
  });

  it('builds PUT payloads without image entries', () => {
    const formData = new FormData();
    formData.append('name_en', 'Updated');
    formData.append('images', 'image-1');
    formData.append('sku', 'SKU-1');

    expect(buildProductsByIdPayload(formData)).toEqual({
      name_en: 'Updated',
      sku: 'SKU-1',
    });
  });

  it('builds PATCH update data and mutation options', () => {
    expect(buildProductsByIdPatchUpdateData({ price: 11.5, stock: 7 })).toEqual({
      price: 11.5,
      stock: 7,
    });
    expect(buildProductsByIdPatchUpdateData({ stock: 7 })).toEqual({
      stock: 7,
    });
    expect(buildProductsByIdMutationOptions('user-1')).toEqual({ userId: 'user-1' });
    expect(buildProductsByIdMutationOptions(null)).toEqual({});
  });
});
