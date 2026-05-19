/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDiskPathFromPublicPath: vi.fn(),
  getImageFileRepository: vi.fn(),
  getProductImageFileRepository: vi.fn(),
  getProductById: vi.fn(),
  getPublicPathFromStoredPath: vi.fn(),
  productUpdateImageFile: vi.fn(),
  readFile: vi.fn(),
  replaceProductImages: vi.fn(),
  sharedUpdateImageFile: vi.fn(),
  uploadBufferToFastComet: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('node:fs', () => ({
  promises: {
    readFile: mocks.readFile,
  },
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  getDiskPathFromPublicPath: mocks.getDiskPathFromPublicPath,
  getImageFileRepository: mocks.getImageFileRepository,
  getProductImageFileRepository: mocks.getProductImageFileRepository,
}));

vi.mock('@/shared/lib/files/services/storage/file-storage-service', () => ({
  getPublicPathFromStoredPath: mocks.getPublicPathFromStoredPath,
  uploadBufferToFastComet: mocks.uploadBufferToFastComet,
}));

import { uploadLinkedImageFileToFastComet } from './handler.linked-upload';

const localImageFile = {
  id: 'image-file-1',
  filename: 'photo.webp',
  filepath: '/uploads/products/SKU/photo.webp',
  mimetype: 'image/webp',
  metadata: { storageSource: 'local' },
  publicUrl: '/uploads/products/SKU/photo.webp',
  size: 123,
  storageProvider: 'local' as const,
  url: '/uploads/products/SKU/photo.webp',
};

const fastCometImageFile = {
  ...localImageFile,
  filepath: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
  metadata: {
    ...localImageFile.metadata,
    storageSource: 'fastcomet',
  },
  publicUrl: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
  storageProvider: 'fastcomet' as const,
  url: 'https://sparksofsindri.com/uploads/products/SKU/photo.webp',
};

const product = {
  id: 'product-1',
  images: [
    {
      assignedAt: '2026-05-19T00:00:00.000Z',
      imageFile: localImageFile,
      imageFileId: 'image-file-1',
      productId: 'product-1',
    },
  ],
};

const createProductRepo = () => ({
  getProductById: mocks.getProductById,
  replaceProductImages: mocks.replaceProductImages,
});

describe('uploadLinkedImageFileToFastComet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDiskPathFromPublicPath.mockReturnValue('/repo/public/uploads/products/SKU/photo.webp');
    mocks.getImageFileRepository.mockResolvedValue({
      updateImageFile: mocks.sharedUpdateImageFile,
    });
    mocks.getProductImageFileRepository.mockResolvedValue({
      updateImageFile: mocks.productUpdateImageFile,
    });
    mocks.getProductById.mockResolvedValue({
      ...product,
      images: [{ ...product.images[0], imageFile: fastCometImageFile }],
    });
    mocks.getPublicPathFromStoredPath.mockReturnValue('/uploads/products/SKU/photo.webp');
    mocks.productUpdateImageFile.mockResolvedValue(null);
    mocks.readFile.mockResolvedValue(Buffer.from('image-bytes'));
    mocks.replaceProductImages.mockResolvedValue(undefined);
    mocks.sharedUpdateImageFile.mockResolvedValue(fastCometImageFile);
    mocks.uploadBufferToFastComet.mockResolvedValue(fastCometImageFile.filepath);
  });

  it('updates a shared image file record after uploading a locally staged modal image', async () => {
    const result = await uploadLinkedImageFileToFastComet({
      linkedImageFile: localImageFile,
      product,
      productId: 'product-1',
      productRepo: createProductRepo(),
    });

    expect(mocks.uploadBufferToFastComet).toHaveBeenCalledWith(
      expect.objectContaining({
        publicPath: '/uploads/products/SKU/photo.webp',
      })
    );
    expect(mocks.sharedUpdateImageFile).toHaveBeenCalledWith(
      'image-file-1',
      expect.objectContaining({
        filepath: fastCometImageFile.filepath,
        publicUrl: fastCometImageFile.filepath,
        storageProvider: 'fastcomet',
        url: fastCometImageFile.filepath,
      })
    );
    expect(mocks.productUpdateImageFile).toHaveBeenCalledWith(
      'image-file-1',
      expect.objectContaining({
        filepath: fastCometImageFile.filepath,
      })
    );
    expect(mocks.replaceProductImages).toHaveBeenCalledWith('product-1', ['image-file-1']);
    expect(result.imageFile).toBe(fastCometImageFile);
    expect(result.remoteUrl).toBe(fastCometImageFile.filepath);
  });

  it('falls back to the Products image repository when the shared record is absent', async () => {
    mocks.sharedUpdateImageFile.mockResolvedValueOnce(null);
    mocks.productUpdateImageFile.mockResolvedValueOnce(fastCometImageFile);

    const result = await uploadLinkedImageFileToFastComet({
      linkedImageFile: localImageFile,
      product,
      productId: 'product-1',
      productRepo: createProductRepo(),
    });

    expect(result.imageFile).toBe(fastCometImageFile);
  });
});
