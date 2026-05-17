import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock, getProductsMongoDbMock, insertOneMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  getProductsMongoDbMock: vi.fn(),
  insertOneMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/db/product-mongo-client', () => ({
  getMongoDb: getProductsMongoDbMock,
}));

import {
  mongoImageFileRepository,
  productMongoImageFileRepository,
} from './mongo-image-file-repository';

describe('mongoImageFileRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertOneMock.mockResolvedValue({ acknowledged: true });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        insertOne: insertOneMock,
      })),
    });
    getProductsMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        insertOne: insertOneMock,
      })),
    });
  });

  it('persists and returns product image storage metadata', async () => {
    const record = await mongoImageFileRepository.createImageFile({
      filename: 'image.jpg',
      filepath: '/uploads/products/SKU/image.jpg',
      publicUrl: '/uploads/products/SKU/image.jpg',
      url: '/uploads/products/SKU/image.jpg',
      mimetype: 'image/jpeg',
      metadata: {
        sourceUrl: 'https://supplier.example/image.jpg',
        storageSource: 'local-fallback',
      },
      size: 1234,
      storageProvider: 'local',
      thumbnailUrl: '/uploads/products/SKU/image-thumb.jpg',
    });

    expect(insertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'image.jpg',
        filepath: '/uploads/products/SKU/image.jpg',
        publicUrl: '/uploads/products/SKU/image.jpg',
        url: '/uploads/products/SKU/image.jpg',
        metadata: {
          sourceUrl: 'https://supplier.example/image.jpg',
          storageSource: 'local-fallback',
        },
        storageProvider: 'local',
        thumbnailUrl: '/uploads/products/SKU/image-thumb.jpg',
      })
    );
    expect(record).toMatchObject({
      filename: 'image.jpg',
      filepath: '/uploads/products/SKU/image.jpg',
      publicUrl: '/uploads/products/SKU/image.jpg',
      url: '/uploads/products/SKU/image.jpg',
      metadata: {
        sourceUrl: 'https://supplier.example/image.jpg',
        storageSource: 'local-fallback',
      },
      storageProvider: 'local',
      thumbnailUrl: '/uploads/products/SKU/image-thumb.jpg',
    });
  });

  it('can persist through the Products database repository', async () => {
    await productMongoImageFileRepository.createImageFile({
      filename: 'product.jpg',
      filepath: '/uploads/products/SKU/product.jpg',
      mimetype: 'image/jpeg',
      size: 321,
    });

    expect(getProductsMongoDbMock).toHaveBeenCalled();
    expect(insertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'product.jpg',
        filepath: '/uploads/products/SKU/product.jpg',
      })
    );
  });
});
