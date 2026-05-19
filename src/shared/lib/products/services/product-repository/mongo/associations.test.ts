import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findImageFilesByIdsMock, findProductImageFilesByIdsMock } = vi.hoisted(() => ({
  findImageFilesByIdsMock: vi.fn(),
  findProductImageFilesByIdsMock: vi.fn(),
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  mongoImageFileRepository: {
    findImageFilesByIds: findImageFilesByIdsMock,
  },
  productMongoImageFileRepository: {
    findImageFilesByIds: findProductImageFilesByIdsMock,
  },
}));

import { mongoProductAssociationsImpl } from './associations';

const createImageFile = (
  id: string,
  filepath: string,
  overrides: Record<string, unknown> = {}
) => ({
  id,
  filename: `${id}.jpg`,
  filepath,
  mimetype: 'image/jpeg',
  size: 100,
  width: 100,
  height: 100,
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('mongoProductAssociationsImpl.replaceProductImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findProductImageFilesByIdsMock.mockResolvedValue([]);
  });

  it('persists images in the requested order even when lookup results are unordered', async () => {
    findImageFilesByIdsMock.mockResolvedValue([
      createImageFile('image-2', '/uploads/products/image-2.jpg'),
      createImageFile('image-1', '/uploads/products/image-1.jpg', {
        metadata: { storageSource: 'local-fallback' },
        publicUrl: ' https://files.example.test/image-1.jpg ',
        storageProvider: 'local',
        thumbnailUrl: 'https://files.example.test/image-1-thumb.jpg',
        url: 'https://files.example.test/image-1-original.jpg',
      }),
    ]);

    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const getCollection = vi.fn().mockResolvedValue({ updateOne });

    await mongoProductAssociationsImpl.replaceProductImages(
      'product-1',
      ['image-1', 'image-2'],
      getCollection as never
    );

    expect(findImageFilesByIdsMock).toHaveBeenCalledWith(['image-1', 'image-2']);
    expect(updateOne).toHaveBeenCalledTimes(1);

    const [, update] = updateOne.mock.calls[0] as [
      unknown,
      {
        $set: {
          images: Array<{
            productId: string;
            imageFileId: string;
            imageFile: {
              filename: string;
              filepath: string;
              id: string;
              metadata?: Record<string, unknown> | null;
              publicUrl?: string;
              storageProvider?: string;
              thumbnailUrl?: string;
              url?: string;
            };
          }>;
          updatedAt: Date;
        };
      },
    ];

    expect(update.$set.images.map((image) => image.imageFileId)).toEqual(['image-1', 'image-2']);
    expect(update.$set.images.map((image) => image.imageFile.id)).toEqual(['image-1', 'image-2']);
    expect(update.$set.images[0]?.imageFile).toEqual(
      expect.objectContaining({
        filename: 'image-1.jpg',
        filepath: '/uploads/products/image-1.jpg',
        metadata: { storageSource: 'local-fallback' },
        publicUrl: 'https://files.example.test/image-1.jpg',
        storageProvider: 'local',
        thumbnailUrl: 'https://files.example.test/image-1-thumb.jpg',
        url: 'https://files.example.test/image-1-original.jpg',
      })
    );
    expect(update.$set.images.every((image) => image.productId === 'product-1')).toBe(true);
    expect(update.$set.updatedAt).toBeInstanceOf(Date);
  });

  it('falls back to the Products database image repository when the shared repository misses', async () => {
    findImageFilesByIdsMock.mockResolvedValue([]);
    findProductImageFilesByIdsMock.mockResolvedValue([
      createImageFile('image-product-db', '/uploads/products/product-db.jpg'),
    ]);

    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const getCollection = vi.fn().mockResolvedValue({ updateOne });

    await mongoProductAssociationsImpl.replaceProductImages(
      'product-1',
      ['image-product-db'],
      getCollection as never
    );

    expect(findImageFilesByIdsMock).toHaveBeenCalledWith(['image-product-db']);
    expect(findProductImageFilesByIdsMock).toHaveBeenCalledWith(['image-product-db']);

    const [, update] = updateOne.mock.calls[0] as [
      unknown,
      {
        $set: {
          images: Array<{
            imageFileId: string;
            imageFile: { filepath: string; id: string };
          }>;
        };
      },
    ];

    expect(update.$set.images).toEqual([
      expect.objectContaining({
        imageFileId: 'image-product-db',
        imageFile: expect.objectContaining({
          filepath: '/uploads/products/product-db.jpg',
          id: 'image-product-db',
        }),
      }),
    ]);
  });
});
