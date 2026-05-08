/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';

const mocks = vi.hoisted(() => ({
  getImageFileRepository: vi.fn(),
  getProductById: vi.fn(),
  getProductRepository: vi.fn(),
  getPublicPathFromStoredPath: vi.fn(),
  getDiskPathFromPublicPath: vi.fn(),
  invalidateProduct: vi.fn(),
  parseJsonBody: vi.fn(),
  readFile: vi.fn(),
  replaceProductImages: vi.fn(),
  updateImageFile: vi.fn(),
  uploadBufferToFastComet: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('node:fs', () => ({
  promises: {
    readFile: mocks.readFile,
  },
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: mocks.parseJsonBody,
}));

vi.mock('@/features/products/performance/cached-service', () => ({
  CachedProductService: {
    invalidateProduct: mocks.invalidateProduct,
  },
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  getDiskPathFromPublicPath: mocks.getDiskPathFromPublicPath,
  getImageFileRepository: mocks.getImageFileRepository,
}));

vi.mock('@/shared/lib/files/services/storage/file-storage-service', () => ({
  getPublicPathFromStoredPath: mocks.getPublicPathFromStoredPath,
  uploadBufferToFastComet: mocks.uploadBufferToFastComet,
}));

vi.mock('@/shared/lib/products/services/product-repository', () => ({
  getProductRepository: mocks.getProductRepository,
}));

import { postHandler } from './handler';

type FastCometUploadRequest = Request & {
  json: () => Promise<unknown>;
};

const createRequest = (body: unknown): FastCometUploadRequest =>
  ({
    json: () => Promise.resolve(body),
  }) as FastCometUploadRequest;

const localImageFile = {
  id: 'image-file-1',
  filename: 'photo.webp',
  filepath: '/uploads/products/SKU/photo.webp',
  mimetype: 'image/webp',
  metadata: { sourceUrl: 'https://shop.example/photo.webp', storageSource: 'local' },
  publicUrl: '/uploads/products/SKU/photo.webp',
  size: 123,
  storageProvider: 'local',
  url: '/uploads/products/SKU/photo.webp',
  width: null,
  height: null,
};

const product = {
  id: 'product-1',
  images: [
    {
      assignedAt: '2026-05-09T00:00:00.000Z',
      imageFile: localImageFile,
      imageFileId: 'image-file-1',
      productId: 'product-1',
    },
  ],
};

describe('product image upload-to-fastcomet handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.parseJsonBody.mockImplementation(
      async (req: FastCometUploadRequest, schema: z.ZodType): Promise<unknown> => {
        const parsed = schema.safeParse(await req.json());
        if (!parsed.success) {
          return { ok: false, response: new Response(null, { status: 400 }) };
        }
        return { ok: true, data: parsed.data };
      }
    );
    mocks.getProductRepository.mockResolvedValue({
      getProductById: mocks.getProductById,
      replaceProductImages: mocks.replaceProductImages,
    });
    mocks.getImageFileRepository.mockResolvedValue({
      updateImageFile: mocks.updateImageFile,
    });
    mocks.getPublicPathFromStoredPath.mockReturnValue('/uploads/products/SKU/photo.webp');
    mocks.getDiskPathFromPublicPath.mockReturnValue(
      '/repo/public/uploads/products/SKU/photo.webp'
    );
    mocks.readFile.mockResolvedValue(Buffer.from('image-bytes'));
    mocks.uploadBufferToFastComet.mockResolvedValue(
      'https://sparksofsindri.com/uploads/products/SKU/photo.webp'
    );
  });

  it('uploads a linked local image file to FastComet and refreshes the product image snapshot', async () => {
    const updatedImageFile = {
      ...localImageFile,
      filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      metadata: {
        ...localImageFile.metadata,
        localPublicPath: '/uploads/products/SKU/photo.webp',
        mirroredLocally: true,
        previousFilepath: '/uploads/products/SKU/photo.webp',
        publicPath: '/uploads/products/SKU/photo.webp',
        storageSource: 'fastcomet',
        uploadedToFastCometAt: '2026-05-09T00:00:00.000Z',
      },
      publicUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      storageProvider: 'fastcomet',
      url: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
    };
    const updatedProduct = {
      ...product,
      images: [
        {
          ...product.images[0],
          imageFile: updatedImageFile,
        },
      ],
    };
    mocks.getProductById.mockResolvedValueOnce(product).mockResolvedValueOnce(updatedProduct);
    mocks.updateImageFile.mockResolvedValueOnce(updatedImageFile);

    const response = await postHandler(
      createRequest({ imageFileId: 'image-file-1', imageSlotIndex: 0 }) as never,
      {} as never,
      { id: ' product-1 ' }
    );
    const json = await response.json();

    expect(mocks.getDiskPathFromPublicPath).toHaveBeenCalledWith(
      '/uploads/products/SKU/photo.webp'
    );
    expect(mocks.readFile).toHaveBeenCalledWith(
      '/repo/public/uploads/products/SKU/photo.webp'
    );
    expect(mocks.uploadBufferToFastComet).toHaveBeenCalledWith({
      buffer: Buffer.from('image-bytes'),
      category: 'products',
      filename: 'photo.webp',
      mimetype: 'image/webp',
      publicPath: '/uploads/products/SKU/photo.webp',
    });
    expect(mocks.updateImageFile).toHaveBeenCalledWith(
      'image-file-1',
      expect.objectContaining({
        filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
        publicUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
        storageProvider: 'fastcomet',
        url: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      })
    );
    expect(mocks.updateImageFile.mock.calls[0]?.[1].metadata).toEqual(
      expect.objectContaining({
        localPublicPath: '/uploads/products/SKU/photo.webp',
        previousFilepath: '/uploads/products/SKU/photo.webp',
        publicPath: '/uploads/products/SKU/photo.webp',
        storageSource: 'fastcomet',
      })
    );
    expect(mocks.replaceProductImages).toHaveBeenCalledWith('product-1', ['image-file-1']);
    expect(mocks.invalidateProduct).toHaveBeenCalledWith('product-1');
    expect(json).toEqual(
      expect.objectContaining({
        status: 'ok',
        imageFile: expect.objectContaining({
          id: 'image-file-1',
          filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
          storageProvider: 'fastcomet',
        }),
        product: updatedProduct,
        publicPath: '/uploads/products/SKU/photo.webp',
        remoteUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
      })
    );
  });

  it('returns existing FastComet image files without uploading again', async () => {
    const fastCometProduct = {
      ...product,
      images: [
        {
          ...product.images[0],
          imageFile: {
            ...localImageFile,
            filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
            metadata: { storageSource: 'fastcomet' },
            storageProvider: 'fastcomet',
          },
        },
      ],
    };
    mocks.getProductById.mockResolvedValueOnce(fastCometProduct);

    const response = await postHandler(
      createRequest({ imageFileId: 'image-file-1', imageSlotIndex: 0 }) as never,
      {} as never,
      { id: 'product-1' }
    );
    const json = await response.json();

    expect(mocks.uploadBufferToFastComet).not.toHaveBeenCalled();
    expect(mocks.updateImageFile).not.toHaveBeenCalled();
    expect(json).toEqual(
      expect.objectContaining({
        alreadyUploaded: true,
        status: 'ok',
      })
    );
  });

  it('rejects image files that are not linked at the requested slot', async () => {
    mocks.getProductById.mockResolvedValueOnce(product);

    await expect(
      postHandler(
        createRequest({ imageFileId: 'other-image-file', imageSlotIndex: 0 }) as never,
        {} as never,
        { id: 'product-1' }
      )
    ).rejects.toThrow('Image file is not linked at the requested product image slot.');

    expect(mocks.uploadBufferToFastComet).not.toHaveBeenCalled();
  });
});
