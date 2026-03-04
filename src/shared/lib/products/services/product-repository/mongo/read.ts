/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Document } from 'mongodb';
import {
  toProductResponse,
} from '../mongo-product-repository-mappers';
import {
  ProductFilters,
  ProductWithImages,
} from '@/shared/contracts/products';
import {
  buildProductIdFilter,
  isEmptyFilter,
} from '../mongo-product-repository.helpers';
import { buildMongoWhere } from '../mongo-product-repository.filters';

export const buildListProjectStage = (filters: ProductFilters): Document | null => {
  if (typeof filters.sku === 'string' && filters.sku.trim().length > 0) {
    return null;
  }
  return {
    _id: 1,
    id: 1,
    sku: 1,
    baseProductId: 1,
    defaultPriceGroupId: 1,
    categoryId: 1,
    catalogId: 1,
    name_en: 1,
    name_pl: 1,
    name_de: 1,
    price: 1,
    stock: 1,
    createdAt: 1,
    updatedAt: 1,
    imageLinks: { $slice: ['$imageLinks', 1] },
    imageBase64s: { $literal: [] },
    images: {
      $map: {
        input: { $slice: ['$images', 1] },
        as: 'image',
        in: {
          productId: '$$image.productId',
          imageFileId: '$$image.imageFileId',
          assignedAt: '$$image.assignedAt',
          imageFile: {
            id: '$$image.imageFile.id',
            filepath: '$$image.imageFile.filepath',
          },
        },
      },
    },
    catalogs: {
      $map: {
        input: { $slice: ['$catalogs', 1] },
        as: 'catalog',
        in: {
          catalogId: '$$catalog.catalogId',
          assignedAt: '$$catalog.assignedAt',
          catalog: {
            id: '$$catalog.catalog.id',
          },
        },
      },
    },
  };
};

export const mongoProductReadImpl = {
  async getProducts(filters: ProductFilters, getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const limit = pageSize;
    const searchFilter = await buildMongoWhere(filters);
    const projectStage = buildListProjectStage(filters);

    if (projectStage) {
      const pipeline: Document[] = [
        { $match: searchFilter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: projectStage },
      ];
      const aggregateOptions = isEmptyFilter(searchFilter)
        ? { hint: { createdAt: -1 } }
        : undefined;
      const docs = await collection
        .aggregate(pipeline, aggregateOptions)
        .toArray();

      return docs.map((doc: any) => toProductResponse(doc));
    }

    let cursor = collection.find(searchFilter).sort({ createdAt: -1 });
    if (isEmptyFilter(searchFilter)) {
      cursor = cursor.hint({ createdAt: -1 });
    }
    cursor = cursor.skip(skip).limit(limit);
    const docs = await cursor.toArray();

    return docs.map((doc: any) => toProductResponse(doc));
  },

  async countProducts(filters: ProductFilters, getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const searchFilter = await buildMongoWhere(filters);
    if (isEmptyFilter(searchFilter)) {
      return collection.estimatedDocumentCount();
    }
    return collection.countDocuments(searchFilter);
  },

  async getProductsWithCount(
    filters: ProductFilters,
    getCollection: () => Promise<any>
  ): Promise<{ products: ProductWithImages[]; total: number }> {
    const collection = await getCollection();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const searchFilter = await buildMongoWhere(filters);
    const projectStage = buildListProjectStage(filters);

    if (isEmptyFilter(searchFilter)) {
      const [docs, total] = await Promise.all([
        (async () => {
          if (projectStage) {
            const pipeline: Document[] = [
              { $match: searchFilter },
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: pageSize },
              { $project: projectStage },
            ];
            return await collection
              .aggregate(pipeline, { hint: { createdAt: -1 } })
              .toArray();
          }

          return await collection
            .find(searchFilter)
            .sort({ createdAt: -1 })
            .hint({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize)
            .toArray();
        })(),
        collection.estimatedDocumentCount(),
      ]);

      return {
        products: docs.map((doc: any) => toProductResponse(doc)),
        total,
      };
    }

    const productsPipeline: Document[] = [
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: pageSize },
    ];
    if (projectStage) {
      productsPipeline.push({ $project: projectStage });
    }

    const [result] = await collection
      .aggregate([
        { $match: searchFilter },
        {
          $facet: {
            products: productsPipeline,
            meta: [{ $count: 'total' }],
          },
        },
      ])
      .toArray();

    const docs = (result)?.products ?? [];
    const total = (result)?.meta?.[0]?.total ?? 0;

    return {
      products: docs.map((doc: any) => toProductResponse(doc)),
      total,
    };
  },

  async getProductById(id: string, getCollection: () => Promise<any>): Promise<ProductWithImages | null> {
    const collection = await getCollection();
    const doc = await collection.findOne(buildProductIdFilter(id));
    if (!doc) return null;
    return toProductResponse(doc);
  },

  async getProductBySku(sku: string, getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const doc = await collection.findOne({ sku });
    if (!doc) return null;
    return toProductResponse(doc);
  },

  async getProductsBySkus(skus: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const docs = await collection.find({ sku: { $in: skus } }).toArray();
    return docs.map((doc: any) => toProductResponse(doc));
  },

  async findProductByBaseId(baseProductId: string, getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const doc = await collection.findOne({ baseProductId });
    if (!doc) return null;
    return toProductResponse(doc);
  },

  async findProductsByBaseIds(baseIds: string[], getCollection: () => Promise<any>) {
    const collection = await getCollection();
    const docs = await collection.find({ baseProductId: { $in: baseIds } }).toArray();
    return docs.map((doc: any) => toProductResponse(doc));
  },
};
