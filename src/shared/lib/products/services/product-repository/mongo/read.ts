import { Document, Collection, Filter, WithId } from 'mongodb';

import { ProductFilters } from '@/shared/contracts/products/drafts';
import { ProductWithImages } from '@/shared/contracts/products/product';

import { ProductDocument, toProductResponse } from '../mongo-product-repository-mappers';
import { buildMongoWhere } from '../mongo-product-repository.filters';
import { buildProductIdFilter, isEmptyFilter } from '../mongo-product-repository.helpers';

type ProductsWithCountAggregateResult = {
  products?: Document[];
  meta?: Array<{ total?: number }>;
};

type DuplicateSkuAggregateResult = {
  _id: string;
  count: number;
};

const normalizeSkuForDuplicateDetection = (sku: unknown): string | null => {
  if (typeof sku !== 'string') return null;
  const trimmed = sku.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
};

const attachDuplicateSkuCounts = async (
  docs: WithId<ProductDocument>[],
  collection: Collection<ProductDocument>
): Promise<WithId<ProductDocument>[]> => {
  const normalizedSkuByProductId = new Map<string, string>();

  docs.forEach((doc) => {
    const normalizedSku = normalizeSkuForDuplicateDetection(doc.sku);
    if (!normalizedSku) return;
    normalizedSkuByProductId.set(doc.id ?? doc._id, normalizedSku);
  });

  if (normalizedSkuByProductId.size === 0) {
    return docs;
  }

  const duplicateCounts = await collection
    .aggregate<DuplicateSkuAggregateResult>([
      {
        $match: {
          sku: { $type: 'string' },
        },
      },
      {
        $project: {
          normalizedSku: {
            $toUpper: {
              $trim: {
                input: '$sku',
              },
            },
          },
        },
      },
      {
        $match: {
          normalizedSku: {
            $in: Array.from(new Set(normalizedSkuByProductId.values())),
          },
        },
      },
      {
        $group: {
          _id: '$normalizedSku',
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const duplicateCountBySku = new Map<string, number>(
    duplicateCounts
      .filter(
        (entry): entry is DuplicateSkuAggregateResult =>
          typeof entry?._id === 'string' &&
          typeof entry.count === 'number' &&
          Number.isFinite(entry.count) &&
          entry.count > 1
      )
      .map((entry) => [entry._id, Math.trunc(entry.count)])
  );

  return docs.map((doc) => {
    const normalizedSku = normalizedSkuByProductId.get(doc.id ?? doc._id);
    const duplicateSkuCount = normalizedSku ? duplicateCountBySku.get(normalizedSku) : undefined;
    return duplicateSkuCount ? { ...doc, duplicateSkuCount } : doc;
  });
};

export const buildListProjectStage = (filters: ProductFilters): Document | null => {
  if (typeof filters.sku === 'string' && filters.sku.trim().length > 0) {
    return null;
  }
  return {
    _id: 1,
    id: 1,
    sku: 1,
    baseProductId: 1,
    importSource: 1,
    defaultPriceGroupId: 1,
    categoryId: 1,
    catalogId: 1,
    name_en: 1,
    name_pl: 1,
    name_de: 1,
    category: {
      id: '$category.id',
      name: '$category.name',
      description: '$category.description',
      createdAt: '$category.createdAt',
      updatedAt: '$category.updatedAt',
      catalogId: '$category.catalogId',
      name_en: '$category.name_en',
      name_pl: '$category.name_pl',
      name_de: '$category.name_de',
      color: '$category.color',
      parentId: '$category.parentId',
      sortIndex: '$category.sortIndex',
    },
    parameters: 1,
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
  };
};

export const mongoProductReadImpl = {
  async getProducts(
    filters: ProductFilters,
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
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
      const docs = await collection.aggregate(pipeline, aggregateOptions).toArray();
      const projectedDocs = await attachDuplicateSkuCounts(
        docs as WithId<ProductDocument>[],
        collection
      );

      return projectedDocs.map((doc) => toProductResponse(doc));
    }

    let cursor = collection.find(searchFilter).sort({ createdAt: -1 });
    if (isEmptyFilter(searchFilter)) {
      cursor = cursor.hint({ createdAt: -1 });
    }
    cursor = cursor.skip(skip).limit(limit);
    const docs = await cursor.toArray();
    const docsWithDuplicateSkuCounts = await attachDuplicateSkuCounts(docs, collection);

    return docsWithDuplicateSkuCounts.map((doc) => toProductResponse(doc));
  },

  async getProductIds(
    filters: ProductFilters,
    getCollection: () => Promise<Collection<ProductDocument>>
  ): Promise<string[]> {
    const collection = await getCollection();
    const searchFilter = await buildMongoWhere(filters);
    let cursor = collection
      .find(searchFilter, { projection: { _id: 0, id: 1 } })
      .sort({ createdAt: -1 });

    if (isEmptyFilter(searchFilter)) {
      cursor = cursor.hint({ createdAt: -1 });
    }

    const docs = await cursor.toArray();
    return docs
      .map((doc) => (typeof doc.id === 'string' && doc.id.trim().length > 0 ? doc.id.trim() : null))
      .filter((id): id is string => id !== null);
  },

  async countProducts(
    filters: ProductFilters,
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const searchFilter = await buildMongoWhere(filters);
    if (isEmptyFilter(searchFilter)) {
      return collection.estimatedDocumentCount();
    }
    return collection.countDocuments(searchFilter);
  },

  async getProductsWithCount(
    filters: ProductFilters,
    getCollection: () => Promise<Collection<ProductDocument>>
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
            return await collection.aggregate(pipeline, { hint: { createdAt: -1 } }).toArray();
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
      const projectedDocs = await attachDuplicateSkuCounts(
        docs as WithId<ProductDocument>[],
        collection
      );

      return {
        products: projectedDocs.map((doc) => toProductResponse(doc)),
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
      .aggregate<ProductsWithCountAggregateResult>([
        { $match: searchFilter },
        {
          $facet: {
            products: productsPipeline,
            meta: [{ $count: 'total' }],
          },
        },
      ])
      .toArray();

    const docs = Array.isArray(result?.products) ? result.products : [];
    const total =
      result?.meta && Array.isArray(result.meta) && typeof result.meta[0]?.total === 'number'
        ? result.meta[0].total
        : 0;
    const projectedDocs = await attachDuplicateSkuCounts(
      docs as WithId<ProductDocument>[],
      collection
    );

    return {
      products: projectedDocs.map((doc) => toProductResponse(doc)),
      total,
    };
  },

  async getProductById(
    id: string,
    getCollection: () => Promise<Collection<ProductDocument>>
  ): Promise<ProductWithImages | null> {
    const collection = await getCollection();
    const doc = await collection.findOne(buildProductIdFilter(id));
    if (!doc) return null;
    return toProductResponse(doc);
  },

  async getProductBySku(sku: string, getCollection: () => Promise<Collection<ProductDocument>>) {
    const collection = await getCollection();
    const doc = await collection.findOne({ sku } as Filter<ProductDocument>);
    if (!doc) return null;
    return toProductResponse(doc);
  },

  async getProductsBySkus(
    skus: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const docs = await collection.find({ sku: { $in: skus } } as Filter<ProductDocument>).toArray();
    return docs.map((doc) => toProductResponse(doc));
  },

  async findProductByBaseId(
    baseProductId: string,
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const doc = await collection.findOne({ baseProductId } as Filter<ProductDocument>);
    if (!doc) return null;
    return toProductResponse(doc);
  },

  async findProductsByBaseIds(
    baseIds: string[],
    getCollection: () => Promise<Collection<ProductDocument>>
  ) {
    const collection = await getCollection();
    const docs = await collection
      .find({ baseProductId: { $in: baseIds } } as Filter<ProductDocument>)
      .toArray();
    return docs.map((doc) => toProductResponse(doc));
  },
};
