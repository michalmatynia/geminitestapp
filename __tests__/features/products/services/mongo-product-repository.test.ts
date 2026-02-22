import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  productCreateIndex: vi.fn(),
  productUpdateOne: vi.fn(),
  productFindOne: vi.fn(),
  categoryFindOne: vi.fn(),
  tagToArray: vi.fn(),
  producerToArray: vi.fn(),
  imageFilesToArray: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { mongoProductRepository } from '@/features/products/services/product-repository/mongo-product-repository';

describe('mongoProductRepository.replaceProductCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'products') {
          return {
            createIndex: mocks.productCreateIndex.mockResolvedValue(undefined),
            updateOne: mocks.productUpdateOne,
            findOne: mocks.productFindOne,
          };
        }
        if (name === 'product_categories') {
          return {
            findOne: mocks.categoryFindOne,
          };
        }
        if (name === 'product_tags') {
          return {
            find: vi.fn().mockReturnValue({
              project: vi.fn().mockReturnValue({
                toArray: mocks.tagToArray,
              }),
            }),
          };
        }
        if (name === 'product_producers') {
          return {
            find: vi.fn().mockReturnValue({
              project: vi.fn().mockReturnValue({
                toArray: mocks.producerToArray,
              }),
            }),
          };
        }
        if (name === 'image_files') {
          return {
            find: vi.fn().mockReturnValue({
              toArray: mocks.imageFilesToArray,
            }),
          };
        }
        return {};
      },
    });
  });

  it('retains category by Mongo _id when category document has no id field', async () => {
    const categoryObjectId = new ObjectId('65debb7c94f94c4f3af8b4c1');
    const categoryId = categoryObjectId.toHexString();
    mocks.categoryFindOne.mockResolvedValue({ _id: categoryObjectId });

    await mongoProductRepository.replaceProductCategory('product-1', categoryId);

    expect(mocks.categoryFindOne).toHaveBeenCalledOnce();
    expect(mocks.productUpdateOne).toHaveBeenCalledWith(
      expect.any(Object),
      {
        $set: {
          categories: [
            {
              productId: 'product-1',
              categoryId,
              assignedAt: expect.any(String),
            },
          ],
          categoryId,
          updatedAt: expect.any(Date),
        },
      }
    );
  });

  it('retains tags by Mongo _id when tag docs have no id field', async () => {
    const tagObjectId = new ObjectId('65debb7c94f94c4f3af8b4c2');
    const tagId = tagObjectId.toHexString();
    mocks.tagToArray.mockResolvedValue([{ _id: tagObjectId }]);

    await mongoProductRepository.replaceProductTags('product-1', [tagId]);

    expect(mocks.productUpdateOne).toHaveBeenCalledWith(
      expect.any(Object),
      {
        $set: {
          tags: [
            {
              productId: 'product-1',
              tagId,
              assignedAt: expect.any(String),
            },
          ],
          updatedAt: expect.any(Date),
        },
      }
    );
  });

  it('retains producers by Mongo _id when producer docs have no id field', async () => {
    const producerObjectId = new ObjectId('65debb7c94f94c4f3af8b4c3');
    const producerId = producerObjectId.toHexString();
    mocks.producerToArray.mockResolvedValue([{ _id: producerObjectId }]);

    await mongoProductRepository.replaceProductProducers('product-1', [producerId]);

    expect(mocks.productUpdateOne).toHaveBeenCalledWith(
      expect.any(Object),
      {
        $set: {
          producers: [
            {
              productId: 'product-1',
              producerId,
              assignedAt: expect.any(String),
            },
          ],
          updatedAt: expect.any(Date),
        },
      }
    );
  });

  it('returns product images when image metadata is embedded in product document', async () => {
    const assignedAt = '2026-02-22T01:02:03.000Z';
    mocks.productFindOne.mockResolvedValue({
      _id: 'product-1',
      id: 'product-1',
      updatedAt: new Date('2026-02-21T12:00:00.000Z'),
      images: [
        {
          productId: 'product-1',
          imageFileId: 'img-1',
          assignedAt,
          imageFile: {
            id: 'img-1',
            filename: 'img-1.png',
            filepath: '/uploads/products/img-1.png',
            mimetype: 'image/png',
            size: 512,
            width: null,
            height: null,
            tags: [],
            createdAt: '2026-02-21T12:00:00.000Z',
            updatedAt: '2026-02-21T12:00:00.000Z',
          },
        },
      ],
    });

    const images = await mongoProductRepository.getProductImages('product-1');

    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      productId: 'product-1',
      imageFileId: 'img-1',
      assignedAt,
      imageFile: {
        id: 'img-1',
        filepath: '/uploads/products/img-1.png',
      },
    });
    expect(mocks.imageFilesToArray).not.toHaveBeenCalled();
  });

  it('hydrates missing image metadata from image_files collection', async () => {
    mocks.productFindOne.mockResolvedValue({
      _id: 'product-2',
      id: 'product-2',
      updatedAt: new Date('2026-02-21T12:00:00.000Z'),
      images: [
        {
          productId: 'product-2',
          imageFileId: 'img-2',
          assignedAt: new Date('2026-02-22T03:04:05.000Z'),
        },
      ],
    });
    mocks.imageFilesToArray.mockResolvedValue([
      {
        _id: 'img-2',
        id: 'img-2',
        filename: 'img-2.png',
        filepath: '/uploads/products/img-2.png',
        mimetype: 'image/png',
        size: 1024,
        width: null,
        height: null,
        tags: [],
        createdAt: new Date('2026-02-21T12:00:00.000Z'),
        updatedAt: new Date('2026-02-21T12:00:00.000Z'),
      },
    ]);

    const images = await mongoProductRepository.getProductImages('product-2');

    expect(images).toHaveLength(1);
    expect(images[0]).toMatchObject({
      productId: 'product-2',
      imageFileId: 'img-2',
      imageFile: {
        id: 'img-2',
        filepath: '/uploads/products/img-2.png',
      },
    });
    expect(images[0]?.assignedAt).toBe('2026-02-22T03:04:05.000Z');
    expect(mocks.imageFilesToArray).toHaveBeenCalledOnce();
  });
});
