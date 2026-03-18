import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findImageFilesByIdsMock } = vi.hoisted(() => ({
  findImageFilesByIdsMock: vi.fn(),
}));

vi.mock('@/shared/lib/files/services/image-file-service', () => ({
  mongoImageFileRepository: {
    findImageFilesByIds: findImageFilesByIdsMock,
  },
}));

import { mongoProductAssociationsImpl } from './associations';

const createImageFile = (id: string, filepath: string) => ({
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
});

describe('mongoProductAssociationsImpl.replaceProductImages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists images in the requested order even when lookup results are unordered', async () => {
    findImageFilesByIdsMock.mockResolvedValue([
      createImageFile('image-2', '/uploads/products/image-2.jpg'),
      createImageFile('image-1', '/uploads/products/image-1.jpg'),
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
          images: Array<{ productId: string; imageFileId: string; imageFile: { id: string } }>;
          updatedAt: Date;
        };
      },
    ];

    expect(update.$set.images.map((image) => image.imageFileId)).toEqual(['image-1', 'image-2']);
    expect(update.$set.images.map((image) => image.imageFile.id)).toEqual(['image-1', 'image-2']);
    expect(update.$set.images.every((image) => image.productId === 'product-1')).toBe(true);
    expect(update.$set.updatedAt).toBeInstanceOf(Date);
  });
});
