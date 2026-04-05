import { describe, expect, it } from 'vitest';

import {
  buildProductImageDeleteResponse,
  requireProductImageDeleteParams,
} from './handler.helpers';

describe('product image delete handler helpers', () => {
  it('requires trimmed product and image file ids', () => {
    expect(
      requireProductImageDeleteParams({
        id: ' product-1 ',
        imageFileId: ' image-file-1 ',
      })
    ).toEqual({
      productId: 'product-1',
      imageFileId: 'image-file-1',
    });

    expect(() =>
      requireProductImageDeleteParams({
        id: '',
        imageFileId: 'image-file-1',
      })
    ).toThrow('Invalid route parameters');
  });

  it('builds the no-content delete response', () => {
    const response = buildProductImageDeleteResponse();

    expect(response.status).toBe(204);
  });
});
