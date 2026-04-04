import { describe, expect, it, vi } from 'vitest';

import {
  buildLinkedProductImageResponse,
  requireLinkedImageBlob,
  requireLinkedImageDownloadResponse,
  requireLinkedProduct,
  requireLinkedProductImageId,
  resolveLinkedImageExtensionForMimeType,
  resolveLinkedImageFilename,
  resolveLinkedImageMimeType,
} from './handler.helpers';

describe('product image link-to-file handler helpers', () => {
  it('requires a trimmed product id and existing product', () => {
    expect(requireLinkedProductImageId({ id: ' product-1 ' })).toBe('product-1');
    expect(() => requireLinkedProductImageId({ id: '   ' })).toThrow('Product id is required');
    expect(requireLinkedProduct({ id: 'product-1' }, 'product-1')).toEqual({ id: 'product-1' });
    expect(() => requireLinkedProduct(null, 'missing-product')).toThrow('Product not found');
  });

  it('validates download responses, non-empty blobs, and image mime types', () => {
    expect(() =>
      requireLinkedImageDownloadResponse({ ok: false, status: 404 }, 'https://cdn.example.com/a')
    ).toThrow('Failed to download image (404).');
    expect(() => requireLinkedImageBlob(new Blob([]), 'https://cdn.example.com/a')).toThrow(
      'Downloaded image is empty.'
    );
    expect(
      resolveLinkedImageMimeType({
        blobType: 'image/webp',
        headerType: 'image/jpeg',
        url: 'https://cdn.example.com/a',
      })
    ).toBe('image/webp');
    expect(() =>
      resolveLinkedImageMimeType({
        blobType: '',
        headerType: 'text/plain',
        url: 'https://cdn.example.com/a',
      })
    ).toThrow('URL does not point to an image.');
  });

  it('resolves filename sources and mime extensions', () => {
    const captureException = vi.fn();

    expect(resolveLinkedImageExtensionForMimeType('image/png')).toBe('.png');
    expect(resolveLinkedImageExtensionForMimeType('image/jpeg')).toBe('.jpg');
    expect(
      resolveLinkedImageFilename({
        url: 'https://cdn.example.com/path/photo',
        mimetype: 'image/png',
      })
    ).toBe('photo.png');
    expect(
      resolveLinkedImageFilename({
        url: 'https://cdn.example.com/path/has-ext.webp',
        preferred: ' custom-name.jpg ',
        mimetype: 'image/png',
      })
    ).toBe('custom-name.jpg');
    expect(
      resolveLinkedImageFilename({
        url: 'not-a-url',
        mimetype: 'image/gif',
        now: () => 123,
        captureException,
      })
    ).toBe('linked-image-123.gif');
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it('builds the linked image upload response', () => {
    expect(
      buildLinkedProductImageResponse({
        id: 'file-1',
        filepath: '/uploads/products/photo.png',
      })
    ).toEqual({
      status: 'ok',
      imageFile: {
        id: 'file-1',
        filepath: '/uploads/products/photo.png',
      },
    });
  });
});
