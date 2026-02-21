import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  productUpdateOne: vi.fn(),
  categoryFindOne: vi.fn(),
  tagToArray: vi.fn(),
  producerToArray: vi.fn(),
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
            updateOne: mocks.productUpdateOne,
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
});
