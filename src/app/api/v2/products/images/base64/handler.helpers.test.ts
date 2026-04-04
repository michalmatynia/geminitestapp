import { describe, expect, it } from 'vitest';

import {
  buildBulkProductImageBase64FailureErrorPayload,
  buildBulkProductImageBase64FailureLogMessage,
  buildBulkProductImageBase64RequestUrl,
  buildBulkProductImageBase64Response,
  requireBulkProductImageBase64Ids,
  summarizeBulkProductImageBase64Results,
} from './handler.helpers';

describe('product images base64 bulk handler helpers', () => {
  it('requires at least one product id and builds per-product request urls', () => {
    expect(requireBulkProductImageBase64Ids(['product-1'])).toEqual(['product-1']);
    expect(() => requireBulkProductImageBase64Ids([])).toThrow('No product ids provided');
    expect(
      buildBulkProductImageBase64RequestUrl(
        'http://localhost/api/v2/products/images/base64',
        'product-1'
      ).toString()
    ).toBe('http://localhost/api/v2/products/product-1/images/base64');
  });

  it('summarizes settled bulk results and builds the failure log payload', () => {
    expect(
      summarizeBulkProductImageBase64Results([
        { status: 'fulfilled', value: { ok: true } },
        { status: 'rejected', reason: new Error('boom') },
      ])
    ).toEqual({
      succeeded: 1,
      failed: 1,
      failureReasons: ['Error: boom'],
    });
    expect(buildBulkProductImageBase64FailureLogMessage(2)).toBe(
      '[products.images.base64.bulk] 2 image conversions failed'
    );
    expect(buildBulkProductImageBase64FailureErrorPayload(['Error: boom'], 3)).toEqual({
      failures: ['Error: boom'],
      totalRequested: 3,
    });
  });

  it('builds the bulk response payload', () => {
    expect(buildBulkProductImageBase64Response(3, 2, 1)).toEqual({
      status: 'ok',
      requested: 3,
      succeeded: 2,
      failed: 1,
    });
  });
});
