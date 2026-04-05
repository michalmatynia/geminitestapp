import { describe, expect, it } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

import { getProductImagesAsBase64 } from './base-exporter-images';

const createProduct = (): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-001',
    stock: 5,
    images: [],
    imageLinks: [],
    imageBase64s: [],
    tags: [],
    catalogs: [],
    parameters: [],
    name_en: 'Product 1',
    name_pl: null,
    name_de: null,
    description_en: null,
    description_pl: null,
    description_de: null,
    categoryId: null,
    price: 10,
    weight: null,
    ean: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
  }) as ProductWithImages;

describe('getProductImagesAsBase64 — cachedImages fast path', () => {
  it('returns cachedImages immediately without processing any images', async () => {
    const cached = {
      '0': 'data:image/jpeg;base64,cachedSlot0',
      '1': 'data:image/jpeg;base64,cachedSlot1',
    };

    // Even with a product that has images, cachedImages should be returned as-is
    const productWithImages = {
      ...createProduct(),
      images: [
        { imageFile: { filepath: '/fake/should-not-be-processed.jpg', mimetype: 'image/jpeg' } },
      ],
    } as ProductWithImages;

    const result = await getProductImagesAsBase64(productWithImages, {
      cachedImages: cached,
    });

    expect(result).toBe(cached);
    expect(Object.keys(result)).toEqual(['0', '1']);
  });

  it('returns empty object for product with no images and no cache', async () => {
    const result = await getProductImagesAsBase64(createProduct());
    expect(result).toEqual({});
  });

  it('aborts when signal is already aborted before processing starts', async () => {
    const controller = new AbortController();
    controller.abort();

    const productWithImages = {
      ...createProduct(),
      images: [
        { imageFile: { filepath: '/fake/img.jpg', mimetype: 'image/jpeg' } },
      ],
    } as ProductWithImages;

    await expect(
      getProductImagesAsBase64(productWithImages, {
        signal: controller.signal,
        concurrencyLimit: 1,
      })
    ).rejects.toThrow('Image processing aborted');
  });
});
