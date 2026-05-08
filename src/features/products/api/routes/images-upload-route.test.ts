import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { imageOptimizer } from '@/features/products/performance';
import { uploadProductImageFileWithLocalFallback } from '@/shared/lib/products/services/product-image-upload-fallback';

import { uploadProductImages } from './images-upload-route';

vi.mock('@/features/products/performance', () => ({
  imageOptimizer: {
    optimize: vi.fn(),
  },
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  uploadFile: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/product-image-upload-fallback', () => ({
  uploadProductImageFileWithLocalFallback: vi.fn(),
}));

describe('uploadProductImages', () => {
  it('persists validated product images through configured storage', async () => {
    vi.mocked(imageOptimizer.optimize).mockResolvedValue([
      {
        format: 'webp',
        size: 'thumbnail',
        buffer: Buffer.from('optimized'),
        width: 150,
        height: 150,
        fileSize: 9,
      },
    ]);
    vi.mocked(uploadProductImageFileWithLocalFallback).mockResolvedValue({
      id: 'image-file-1',
      filename: 'stored.png',
      filepath: 'https://sparksofsindri.com/uploads/products/SKU_123/stored.png',
      mimetype: 'image/png',
      size: 4,
    });

    const req = new NextRequest('http://localhost/api/v2/products/images/upload?sku=SKU%20123');
    const file = new File([new Uint8Array([1, 2, 3, 4])], 'original.png', {
      type: 'image/png',
    });

    const response = await uploadProductImages(req, [
      {
        file,
        sanitizedName: 'clean.png',
        hash: 'abcdef1234567890',
      },
    ]);
    const body = (await response.json()) as {
      success: boolean;
      uploaded: number;
      files: Array<{ imageFileId: string; url: string; optimizedVersions: number }>;
    };

    expect(uploadProductImageFileWithLocalFallback).toHaveBeenCalledWith({
      action: 'uploadProductImages',
      file,
      filename: 'clean.png',
      service: 'products.images-upload',
      sku: 'SKU 123',
    });
    expect(body).toEqual({
      success: true,
      uploaded: 1,
      files: [
        expect.objectContaining({
          imageFileId: 'image-file-1',
          optimizedVersions: 1,
          url: 'https://sparksofsindri.com/uploads/products/SKU_123/stored.png',
        }),
      ],
    });
  });
});
