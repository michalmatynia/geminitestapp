import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getMongoDb: vi.fn(),
  productCreateIndex: vi.fn(),
  productUpdateOne: vi.fn(),
  productFindOne: vi.fn(),
  productFind: vi.fn(),
  productAggregate: vi.fn(),
  tagToArray: vi.fn(),
  producerToArray: vi.fn(),
  catalogToArray: vi.fn(),
  imageFilesToArray: vi.fn(),
  integrationToArray: vi.fn(),
  listingDistinct: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

vi.mock('@/shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

import { mongoProductRepository } from '@/shared/lib/products/services/product-repository/mongo-product-repository';
import { invalidateMongoBaseExportLookupContextCache } from '@/shared/lib/products/services/product-repository/mongo-product-repository.helpers';

describe('mongoProductRepository.replaceProductCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateMongoBaseExportLookupContextCache();
    mocks.integrationToArray.mockResolvedValue([]);
    mocks.listingDistinct.mockResolvedValue([]);

    mocks.getMongoDb.mockResolvedValue({
      collection: (name: string) => {
        if (name === 'products') {
          return {
            createIndex: mocks.productCreateIndex.mockResolvedValue(undefined),
            updateOne: mocks.productUpdateOne,
            findOne: mocks.productFindOne,
            find: mocks.productFind.mockReturnValue({
              sort: vi.fn().mockReturnValue({
                skip: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    toArray: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
            aggregate: mocks.productAggregate.mockReturnValue({
              toArray: vi.fn().mockResolvedValue([]),
            }),
          };
        }
        if (name === 'product_categories') {
          return {
            findOne: vi.fn(),
          };
        }
        if (name === 'product_tags') {
          return {
            find: vi.fn().mockReturnValue({
              toArray: mocks.tagToArray,
            }),
          };
        }
        if (name === 'product_producers') {
          return {
            find: vi.fn().mockReturnValue({
              toArray: mocks.producerToArray,
            }),
          };
        }
        if (name === 'catalogs') {
          return {
            find: vi.fn().mockReturnValue({
              toArray: mocks.catalogToArray,
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
        if (name === 'integrations') {
          return {
            find: vi.fn().mockReturnValue({
              project: vi.fn().mockReturnValue({
                toArray: mocks.integrationToArray,
              }),
              toArray: mocks.integrationToArray,
            }),
          };
        }
        if (name === 'product_listings') {
          return {
            distinct: mocks.listingDistinct,
          };
        }
        return {};
      },
    });
  });

  it('sets categoryId directly on the product document', async () => {
    const categoryObjectId = new ObjectId('65debb7c94f94c4f3af8b4c1');
    const categoryId = categoryObjectId.toHexString();

    await mongoProductRepository.replaceProductCategory('product-1', categoryId);

    expect(mocks.productUpdateOne).toHaveBeenCalledWith(expect.any(Object), {
      $set: {
        categoryId,
        updatedAt: expect.any(Date),
      },
      $unset: {
        categories: '',
      },
    });
  });

  it('retains tags by Mongo _id when tag docs have no id field', async () => {
    const tagObjectId = new ObjectId('65debb7c94f94c4f3af8b4c2');
    const tagId = tagObjectId.toHexString();
    mocks.tagToArray.mockResolvedValue([{ _id: tagObjectId }]);

    await mongoProductRepository.replaceProductTags('product-1', [tagId]);

    expect(mocks.productUpdateOne).toHaveBeenCalledWith(expect.any(Object), {
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
    });
  });

  it('syncs scalar catalogId when replacing product catalogs', async () => {
    const catalogId = 'catalog-1';
    mocks.catalogToArray.mockResolvedValue([
      {
        _id: catalogId,
        id: catalogId,
        name: 'Mentios',
        description: null,
        isDefault: false,
        defaultLanguageId: null,
        defaultPriceGroupId: null,
        createdAt: new Date('2026-03-11T10:00:00.000Z'),
        updatedAt: new Date('2026-03-11T10:00:00.000Z'),
        languageIds: [],
        priceGroupIds: [],
      },
    ]);

    await mongoProductRepository.replaceProductCatalogs('product-1', [catalogId]);

    expect(mocks.productUpdateOne).toHaveBeenCalledWith(expect.any(Object), {
      $set: {
        catalogs: [
          {
            productId: 'product-1',
            catalogId,
            assignedAt: expect.any(String),
            catalog: { id: catalogId },
          },
        ],
        catalogId,
        updatedAt: expect.any(Date),
      },
    });
  });

  it('retains producers by Mongo _id when producer docs have no id field', async () => {
    const producerObjectId = new ObjectId('65debb7c94f94c4f3af8b4c3');
    const producerId = producerObjectId.toHexString();
    mocks.producerToArray.mockResolvedValue([{ _id: producerObjectId }]);

    await mongoProductRepository.replaceProductProducers('product-1', [producerId]);

    expect(mocks.productUpdateOne).toHaveBeenCalledWith(expect.any(Object), {
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
    });
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

  it('compiles advanced relation and boolean filters for getProducts', async () => {
    const advancedFilter = JSON.stringify({
      type: 'group',
      id: 'root',
      combinator: 'and',
      not: false,
      rules: [
        { type: 'condition', id: 'c1', field: 'catalogId', operator: 'in', value: ['cat-1'] },
        { type: 'condition', id: 'c2', field: 'tagId', operator: 'eq', value: 'tag-1' },
        { type: 'condition', id: 'c3', field: 'producerId', operator: 'notIn', value: ['prod-2'] },
        { type: 'condition', id: 'c4', field: 'published', operator: 'eq', value: true },
      ],
    });

    await mongoProductRepository.getProducts({ advancedFilter });

    expect(mocks.productAggregate).toHaveBeenCalledOnce();
    const pipeline = mocks.productAggregate.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const match = pipeline?.find((stage) => '$match' in stage)?.['$match'] as Record<
      string,
      unknown
    >;
    const serializedMatch = JSON.stringify(match);

    expect(serializedMatch).toContain('catalogs.catalogId');
    expect(serializedMatch).toContain('tag-1');
    expect(serializedMatch).toContain('producers.producerId');
    expect(serializedMatch).toContain('published');
  });

  it('compiles advanced baseExported filter using Base listing lookup context', async () => {
    mocks.integrationToArray.mockResolvedValue([{ _id: 'integration-base', slug: 'base-com' }]);
    mocks.listingDistinct.mockResolvedValue(['product-exported']);

    const advancedFilter = JSON.stringify({
      type: 'group',
      id: 'root',
      combinator: 'and',
      not: false,
      rules: [{ type: 'condition', id: 'c1', field: 'baseExported', operator: 'eq', value: true }],
    });

    await mongoProductRepository.getProducts({ advancedFilter });

    expect(mocks.integrationToArray).toHaveBeenCalledOnce();
    expect(mocks.listingDistinct).toHaveBeenCalledOnce();
    const pipeline = mocks.productAggregate.mock.calls[0]?.[0] as Array<Record<string, unknown>>;
    const match = pipeline?.find((stage) => '$match' in stage)?.['$match'] as Record<
      string,
      unknown
    >;
    const serializedMatch = JSON.stringify(match);

    expect(serializedMatch).toContain('baseProductId');
    expect(serializedMatch).toContain('product-exported');
  });
});
