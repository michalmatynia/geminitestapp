import { describe, expect, it } from 'vitest';

import {
  normalizeAmazonAsin,
  resolveDetectedAmazonAsinOutcome,
  resolveProductScanDisplayName,
  resolveProductScanImageCandidates,
} from './product-scan-amazon.helpers';

describe('product Amazon scan helpers', () => {
  it('normalizes and validates Amazon ASIN values', () => {
    expect(normalizeAmazonAsin(' b00test123 ')).toBe('B00TEST123');
    expect(normalizeAmazonAsin('not-an-asin')).toBeNull();
    expect(normalizeAmazonAsin(null)).toBeNull();
  });

  it('returns up to three usable image candidates in file-first order', () => {
    const candidates = resolveProductScanImageCandidates({
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/one.jpg',
            publicUrl: 'https://cdn.example.com/one.jpg',
            filename: 'one.jpg',
          },
        },
        {
          imageFileId: 'image-2',
          imageFile: {
            id: 'image-2',
            filepath: '',
            url: 'https://cdn.example.com/two.jpg',
            filename: 'two.jpg',
          },
        },
        {
          imageFileId: 'image-3',
          imageFile: {
            id: 'image-3',
            filepath: '/tmp/three.jpg',
            filename: 'three.jpg',
          },
        },
        {
          imageFileId: 'image-4',
          imageFile: {
            id: 'image-4',
            filepath: '/tmp/four.jpg',
            filename: 'four.jpg',
          },
        },
      ],
    } as never);

    expect(candidates).toEqual([
      {
        id: 'image-1',
        filepath: '/tmp/one.jpg',
        url: 'https://cdn.example.com/one.jpg',
        filename: 'one.jpg',
      },
      {
        id: 'image-3',
        filepath: '/tmp/three.jpg',
        url: null,
        filename: 'three.jpg',
      },
      {
        id: 'image-4',
        filepath: '/tmp/four.jpg',
        url: null,
        filename: 'four.jpg',
      },
    ]);
  });

  it('falls back to imageLinks when image file records are unavailable', () => {
    const candidates = resolveProductScanImageCandidates({
      images: [],
      imageLinks: [
        ' https://cdn.example.com/from-link.jpg ',
        '',
        'https://cdn.example.com/from-link.jpg',
        'https://cdn.example.com/second-link.jpg',
      ],
    } as never);

    expect(candidates).toEqual([
      {
        id: null,
        filepath: null,
        url: 'https://cdn.example.com/from-link.jpg',
        filename: null,
      },
      {
        id: null,
        filepath: null,
        url: 'https://cdn.example.com/second-link.jpg',
        filename: null,
      },
    ]);
  });

  it('skips unusable image-file records so fallback imageLinks can still be used', () => {
    const candidates = resolveProductScanImageCandidates({
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '',
            url: '',
            filename: 'missing-source.jpg',
          },
        },
        {
          imageFileId: 'image-2',
          imageFile: {
            id: 'image-2',
            filepath: null,
            url: null,
            filename: 'also-missing.jpg',
          },
        },
      ],
      imageLinks: [
        'https://cdn.example.com/usable-link.jpg',
      ],
    } as never);

    expect(candidates).toEqual([
      {
        id: null,
        filepath: null,
        url: 'https://cdn.example.com/usable-link.jpg',
        filename: null,
      },
    ]);
  });

  it('keeps HTTP filepaths and thumbnail URLs as URL-backed scan candidates', () => {
    const candidates = resolveProductScanImageCandidates({
      images: [
        {
          imageFileId: 'image-http',
          imageFile: {
            id: 'file-http',
            filepath: 'https://cdn.example.com/remote-path.jpg',
            filename: 'remote-path.jpg',
          },
        },
        {
          imageFileId: 'image-thumb',
          imageFile: {
            id: 'file-thumb',
            filepath: '',
            thumbnailUrl: 'https://cdn.example.com/thumb.webp',
            filename: 'thumb.webp',
          },
        },
      ],
      imageLinks: [],
    } as never);

    expect(candidates).toEqual([
      {
        id: 'file-http',
        filepath: null,
        url: 'https://cdn.example.com/remote-path.jpg',
        filename: 'remote-path.jpg',
      },
      {
        id: 'file-thumb',
        filepath: null,
        url: 'https://cdn.example.com/thumb.webp',
        filename: 'thumb.webp',
      },
    ]);
  });

  it('prioritizes file-backed candidates ahead of URL-only candidates', () => {
    const candidates = resolveProductScanImageCandidates({
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/file-only.jpg',
            filename: 'file-only.jpg',
          },
        },
        {
          imageFileId: 'image-2',
          imageFile: {
            id: 'image-2',
            filepath: '/tmp/url-backed.jpg',
            publicUrl: 'https://cdn.example.com/url-backed.jpg',
            filename: 'url-backed.jpg',
          },
        },
      ],
      imageLinks: ['https://cdn.example.com/from-link.jpg'],
    } as never);

    expect(candidates).toEqual([
      {
        id: 'image-1',
        filepath: '/tmp/file-only.jpg',
        url: null,
        filename: 'file-only.jpg',
      },
      {
        id: 'image-2',
        filepath: '/tmp/url-backed.jpg',
        url: 'https://cdn.example.com/url-backed.jpg',
        filename: 'url-backed.jpg',
      },
      {
        id: null,
        filepath: null,
        url: 'https://cdn.example.com/from-link.jpg',
        filename: null,
      },
    ]);
  });

  it('deduplicates imageLinks against image-file URLs even when the file candidate was keyed by filepath', () => {
    const candidates = resolveProductScanImageCandidates({
      images: [
        {
          imageFileId: 'image-1',
          imageFile: {
            id: 'image-1',
            filepath: '/tmp/one.jpg',
            publicUrl: 'https://cdn.example.com/one.jpg',
            filename: 'one.jpg',
          },
        },
      ],
      imageLinks: [
        'https://cdn.example.com/one.jpg',
        'https://cdn.example.com/two.jpg',
      ],
    } as never);

    expect(candidates).toEqual([
      {
        id: 'image-1',
        filepath: '/tmp/one.jpg',
        url: 'https://cdn.example.com/one.jpg',
        filename: 'one.jpg',
      },
      {
        id: null,
        filepath: null,
        url: 'https://cdn.example.com/two.jpg',
        filename: null,
      },
    ]);
  });

  it('prefers the localized product name before SKU or id', () => {
    expect(
      resolveProductScanDisplayName({
        id: 'product-1',
        name_en: '',
        name_pl: 'Polish name',
        name_de: null,
        sku: 'SKU-1',
      } as never)
    ).toBe('Polish name');
  });

  it('truncates overly long display names to the scan contract limit', () => {
    expect(
      resolveProductScanDisplayName({
        id: 'product-1',
        name_en: ` ${'A'.repeat(340)} `,
        name_pl: null,
        name_de: null,
        sku: 'SKU-1',
      } as never)
    ).toBe('A'.repeat(300));
  });

  it('marks an empty product ASIN as updatable', () => {
    expect(
      resolveDetectedAmazonAsinOutcome({
        existingAsin: null,
        detectedAsin: 'b00test123',
      })
    ).toEqual({
      scanStatus: 'completed',
      asinUpdateStatus: 'updated',
      normalizedDetectedAsin: 'B00TEST123',
      message: 'Product ASIN filled from Amazon scan.',
    });
  });

  it('keeps matching ASINs unchanged', () => {
    expect(
      resolveDetectedAmazonAsinOutcome({
        existingAsin: 'B00TEST123',
        detectedAsin: 'b00test123',
      })
    ).toEqual({
      scanStatus: 'completed',
      asinUpdateStatus: 'unchanged',
      normalizedDetectedAsin: 'B00TEST123',
      message: 'Product already had the detected ASIN.',
    });
  });

  it('surfaces ASIN conflicts instead of overwriting them', () => {
    expect(
      resolveDetectedAmazonAsinOutcome({
        existingAsin: 'B00TEST123',
        detectedAsin: 'B00TEST999',
      })
    ).toEqual({
      scanStatus: 'conflict',
      asinUpdateStatus: 'conflict',
      normalizedDetectedAsin: 'B00TEST999',
      message: 'Detected ASIN B00TEST999 differs from existing ASIN B00TEST123.',
    });
  });
});
