import 'server-only';

import { randomUUID } from 'crypto';

import { ObjectId, type Document, type Filter, type WithId } from 'mongodb';

import { mongoImageFileRepository } from '@/features/files/server';
import { mongoCatalogRepository } from '@/features/products/services/catalog-repository/mongo-catalog-repository';
import type { ProductRecord, ProductWithImages, ProductImageRecord, CatalogRecord } from '@/features/products/types';
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  TransactionalProductRepository,
  UpdateProductInput,
} from '@/features/products/types/services/product-repository';
import { conflictError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { ImageFileRecord } from '@/shared/types/domain/files';

import type { Prisma } from '@prisma/client';

type ProductDocument = Omit<
  ProductRecord,
  'createdAt' | 'updatedAt' | 'name' | 'description' | 'published' | 'catalogId' | 'tags' | 'images' | 'catalogs'
> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  name?: ProductRecord['name'];
  description?: ProductRecord['description'];
  published?: boolean;
  catalogId?: string;
  images?: ProductWithImages['images'];
  catalogs?: ProductWithImages['catalogs'];
  categories?: Array<{ categoryId: string; assignedAt?: string }>;
  categoryId?: string | null;
  tags?: ProductWithImages['tags'];
  producers?: ProductWithImages['producers'];
};

const productCollectionName = 'products';
const integrationCollectionName = 'integrations';
const listingCollectionName = 'product_listings';
const BASE_INTEGRATION_SLUGS = ['baselinker', 'base-com', 'base'] as const;

type IntegrationSlugDocument = {
  _id: string;
  slug: string;
};

type ProductListingFilterDocument = {
  productId: string;
  integrationId: string;
  externalListingId?: string | null;
};

let productIndexesEnsured: Promise<void> | null = null;

const ensureProductIndexes = async (): Promise<void> => {
  if (!productIndexesEnsured) {
    productIndexesEnsured = (async (): Promise<void> => {
      const db = await getMongoDb();
      const collection = db.collection<ProductDocument>(productCollectionName);
      await Promise.all([
        collection.createIndex({ createdAt: -1 }, { name: 'products_createdAt_desc' }),
        collection.createIndex({ updatedAt: -1 }, { name: 'products_updatedAt_desc' }),
        collection.createIndex({ sku: 1 }, { name: 'products_sku' }),
        collection.createIndex({ id: 1 }, { name: 'products_id' }),
        collection.createIndex({ baseProductId: 1 }, { name: 'products_baseProductId' }),
        collection.createIndex({ categoryId: 1 }, { name: 'products_categoryId' }),
        collection.createIndex({ 'catalogs.catalogId': 1 }, { name: 'products_catalogId' }),
        collection.createIndex({ name_en: 1 }, { name: 'products_name_en' }),
        collection.createIndex({ name_pl: 1 }, { name: 'products_name_pl' }),
        collection.createIndex({ name_de: 1 }, { name: 'products_name_de' }),
      ]);
    })();
  }
  try {
    await productIndexesEnsured;
  } catch (error) {
    productIndexesEnsured = null;
    throw error;
  }
};

const getProductCollection = async () => {
  await ensureProductIndexes();
  const db = await getMongoDb();
  return db.collection<ProductDocument>(productCollectionName);
};

const isEmptyFilter = (filter: Filter<ProductDocument>): boolean =>
  Object.keys(filter as Record<string, unknown>).length === 0;

const appendAndCondition = (
  filter: Filter<ProductDocument>,
  condition: Filter<ProductDocument>
): Filter<ProductDocument> => {
  if (isEmptyFilter(filter)) return condition;
  return {
    $and: [filter, condition],
  } as Filter<ProductDocument>;
};

const normalizeLookupId = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : '';
  }
  if (value instanceof ObjectId) {
    return value.toHexString();
  }
  return '';
};

const normalizeProductParameterValues = (
  input: unknown
): Array<{ parameterId: string; value: string; valuesByLanguage?: Record<string, string> }> => {
  if (!Array.isArray(input)) return [];
  return input.reduce(
    (
      acc: Array<{
        parameterId: string;
        value: string;
        valuesByLanguage?: Record<string, string>;
      }>,
      raw: unknown
    ) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return acc;
      const record = raw as Record<string, unknown>;
      const parameterId =
        typeof record['parameterId'] === 'string'
          ? record['parameterId'].trim()
          : '';
      if (!parameterId) return acc;
      const value =
        typeof record['value'] === 'string' ? record['value'] : '';
      const valuesByLanguageRaw = record['valuesByLanguage'];
      const valuesByLanguage =
        valuesByLanguageRaw &&
        typeof valuesByLanguageRaw === 'object' &&
        !Array.isArray(valuesByLanguageRaw)
          ? Object.entries(valuesByLanguageRaw as Record<string, unknown>).reduce(
            (map: Record<string, string>, [lang, langValue]: [string, unknown]) => {
              const normalizedLang = lang.trim().toLowerCase();
              const normalizedValue =
                typeof langValue === 'string' ? langValue.trim() : '';
              if (!normalizedLang || !normalizedValue) return map;
              map[normalizedLang] = normalizedValue;
              return map;
            },
            {}
          )
          : {};
      acc.push({
        parameterId,
        value,
        ...(Object.keys(valuesByLanguage).length > 0
          ? { valuesByLanguage }
          : {}),
      });
      return acc;
    },
    []
  );
};

const applyBaseExportedFilter = async (
  filter: Filter<ProductDocument>,
  baseExported: boolean | undefined
): Promise<Filter<ProductDocument>> => {
  if (baseExported === undefined) return filter;

  const db = await getMongoDb();
  const integrations = await db
    .collection<IntegrationSlugDocument>(integrationCollectionName)
    .find(
      { slug: { $in: [...BASE_INTEGRATION_SLUGS] } },
      { projection: { _id: 1 } }
    )
    .toArray();

  const integrationIds = integrations
    .map((integration: IntegrationSlugDocument) => normalizeLookupId(integration._id))
    .filter((id: string) => id.length > 0);

  if (integrationIds.length === 0) {
    if (baseExported) {
      return appendAndCondition(filter, {
        id: '__no_base_exported_products__',
      } as Filter<ProductDocument>);
    }
    return filter;
  }

  const exportedProductIdsRaw = await db
    .collection<ProductListingFilterDocument>(listingCollectionName)
    .distinct('productId', {
      integrationId: { $in: integrationIds },
      externalListingId: { $exists: true, $nin: [null, ''] },
    });

  const exportedProductIds = exportedProductIdsRaw
    .map((value: unknown) => normalizeLookupId(value))
    .filter((id: string) => id.length > 0);

  if (baseExported) {
    if (exportedProductIds.length === 0) {
      return appendAndCondition(filter, {
        id: '__no_base_exported_products__',
      } as Filter<ProductDocument>);
    }
    return appendAndCondition(filter, {
      $or: [
        { id: { $in: exportedProductIds } },
        { _id: { $in: exportedProductIds } },
      ],
    } as Filter<ProductDocument>);
  }

  if (exportedProductIds.length === 0) {
    return filter;
  }

  return appendAndCondition(filter, {
    $and: [
      { id: { $nin: exportedProductIds } },
      { _id: { $nin: exportedProductIds } },
    ],
  } as Filter<ProductDocument>);
};

const buildListProjectStage = (filters: ProductFilters): Document | null => {
  // List/grid queries should return only fields used by table cells and row actions.
  // This avoids transferring large document payloads (notably descriptions/base64 arrays).
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
    categories: { $slice: ['$categories', 1] },
    catalogId: 1,
    catalogs: { $slice: ['$catalogs', 1] },
    name_en: 1,
    name_pl: 1,
    name_de: 1,
    price: 1,
    stock: 1,
    createdAt: 1,
    updatedAt: 1,
    imageLinks: { $slice: ['$imageLinks', 1] },
    imageBase64s: { $literal: [] },
    images: { $slice: ['$images', 1] },
  };
};

const buildProductIdFilter = (id: string): Filter<ProductDocument> => {
  const normalized = id.trim();
  const conditions: Array<Record<string, unknown>> = [
    { id: normalized },
    { _id: normalized },
  ];
  if (ObjectId.isValid(normalized)) {
    conditions.push({ _id: new ObjectId(normalized) });
  }
  return { $or: conditions } as Filter<ProductDocument>;
};

const normalizeImageFileIds = (imageFileIds: string[]): string[] => {
  const unique = new Set<string>();
  for (const rawId of imageFileIds) {
    const trimmed = rawId.trim();
    if (!trimmed || unique.has(trimmed)) continue;
    unique.add(trimmed);
  }
  return Array.from(unique);
};

const toTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveCategoryId = (doc: ProductDocument): string | null => {
  const direct = toTrimmedString(doc.categoryId);
  if (direct) return direct;

  if (Array.isArray(doc.categories)) {
    for (const entry of doc.categories as unknown[]) {
      if (!entry || typeof entry !== 'object') continue;
      const record = entry as Record<string, unknown>;
      const categoryId =
        toTrimmedString(record['categoryId']) ??
        toTrimmedString(record['category_id']) ??
        toTrimmedString(record['id']) ??
        toTrimmedString(record['value']);
      if (categoryId) return categoryId;
    }
    return null;
  }

  if (doc.categories && typeof doc.categories === 'object') {
    const record = doc.categories as Record<string, unknown>;
    const categoryId =
      toTrimmedString(record['categoryId']) ??
      toTrimmedString(record['category_id']) ??
      toTrimmedString(record['id']) ??
      toTrimmedString(record['value']);
    if (categoryId) return categoryId;
  }

  return null;
};

const normalizeProducerRelations = (
  producers: unknown,
  fallbackProductId: string,
  fallbackAssignedAt: string
): NonNullable<ProductWithImages['producers']> => {
  if (!Array.isArray(producers)) return [];
  const normalized: NonNullable<ProductWithImages['producers']> = [];
  const seen = new Set<string>();
  for (const entry of producers) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const producerId =
      toTrimmedString(record['producerId']) ??
      toTrimmedString(record['producer_id']) ??
      toTrimmedString(record['id']) ??
      toTrimmedString(record['value']);
    if (!producerId || seen.has(producerId)) continue;
    seen.add(producerId);

    const relationProductId =
      toTrimmedString(record['productId']) ??
      toTrimmedString(record['product_id']) ??
      fallbackProductId;

    const rawAssignedAt = record['assignedAt'] ?? record['assigned_at'];
    let assignedAt = fallbackAssignedAt;
    if (rawAssignedAt && typeof rawAssignedAt === 'object' && rawAssignedAt instanceof Date) {
      assignedAt = rawAssignedAt.toISOString();
    } else {
      assignedAt = toTrimmedString(rawAssignedAt) ?? fallbackAssignedAt;
    }

    const relation: NonNullable<ProductWithImages['producers']>[number] = {
      productId: relationProductId,
      producerId,
      assignedAt,
    };

    if (record['producer'] && typeof record['producer'] === 'object') {
      relation.producer = record['producer'] as NonNullable<ProductWithImages['producers']>[number]['producer'];
    }
    normalized.push(relation);
  }
  return normalized;
};

const normalizeTagRelations = (
  tags: unknown,
  fallbackProductId: string,
  fallbackAssignedAt: string
): NonNullable<ProductRecord['tags']> => {
  if (!Array.isArray(tags)) return [];
  const normalized: NonNullable<ProductRecord['tags']> = [];
  const seen = new Set<string>();
  for (const entry of tags) {
    if (!entry || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const tagId =
      toTrimmedString(record['tagId']) ??
      toTrimmedString(record['tag_id']) ??
      toTrimmedString(record['id']) ??
      toTrimmedString(record['value']);
    if (!tagId || seen.has(tagId)) continue;
    seen.add(tagId);

    const relationProductId =
      toTrimmedString(record['productId']) ??
      toTrimmedString(record['product_id']) ??
      fallbackProductId;

    const rawAssignedAt = record['assignedAt'] ?? record['assigned_at'];
    let assignedAt = fallbackAssignedAt;
    if (rawAssignedAt && typeof rawAssignedAt === 'object' && rawAssignedAt instanceof Date) {
      assignedAt = rawAssignedAt.toISOString();
    } else {
      assignedAt = toTrimmedString(rawAssignedAt) ?? fallbackAssignedAt;
    }

    const relation: NonNullable<ProductRecord['tags']>[number] = {
      productId: relationProductId,
      tagId,
      assignedAt,
    };

    if (record['tag'] && typeof record['tag'] === 'object') {
      relation.tag = record['tag'] as NonNullable<ProductRecord['tags']>[number]['tag'];
    }
    normalized.push(relation);
  }
  return normalized;
};

const toProductResponse = (doc: WithId<ProductDocument>): ProductWithImages => {
  const productId = doc.id ?? doc._id;
  const images = Array.isArray(doc.images) ? doc.images : [];
  const catalogs = Array.isArray(doc.catalogs) ? doc.catalogs : [];
  const fallbackAssignedAt = doc.updatedAt instanceof Date
    ? doc.updatedAt.toISOString()
    : ((doc.updatedAt as unknown as string) || new Date().toISOString());
  const tags = normalizeTagRelations(doc.tags, productId, fallbackAssignedAt);
  const producers = normalizeProducerRelations(doc.producers, productId, fallbackAssignedAt);
  const noteIds = Array.isArray((doc as unknown as { noteIds?: unknown }).noteIds)
    ? ((doc as unknown as { noteIds: string[] }).noteIds)
    : [];

  return {
    id: productId,
    sku: doc.sku ?? null,
    baseProductId: doc.baseProductId ?? null,
    defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
    ean: doc.ean ?? null,
    gtin: doc.gtin ?? null,
    asin: doc.asin ?? null,
    name: doc.name || { en: doc.name_en ?? '', pl: doc.name_pl ?? null, de: doc.name_de ?? null },
    description: doc.description || { en: doc.description_en ?? '', pl: doc.description_pl ?? null, de: doc.description_de ?? null },
    name_en: doc.name_en ?? null,
    name_pl: doc.name_pl ?? null,
    name_de: doc.name_de ?? null,
    description_en: doc.description_en ?? null,
    description_pl: doc.description_pl ?? null,
    description_de: doc.description_de ?? null,
    supplierName: doc.supplierName ?? null,
    supplierLink: doc.supplierLink ?? null,
    priceComment: doc.priceComment ?? null,
    stock: doc.stock ?? null,
    price: doc.price ?? null,
    sizeLength: doc.sizeLength ?? null,
    sizeWidth: doc.sizeWidth ?? null,
    weight: doc.weight ?? null,
    length: doc.length ?? null,
    published: doc.published ?? false,
    catalogId: doc.catalogId ?? '',
    parameters: Array.isArray(doc.parameters) ? doc.parameters : [],
    imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
    imageBase64s: Array.isArray(doc.imageBase64s) ? doc.imageBase64s : [],
    noteIds,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : (doc.createdAt as unknown as string),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : (doc.updatedAt as unknown as string),
    images: images.map(img => ({ ...img, assignedAt: img.assignedAt })),
    catalogs: catalogs.map(cat => ({ ...cat, assignedAt: cat.assignedAt })),
    categoryId: resolveCategoryId(doc),
    tags,
    producers,
  };
};

const toProductBase = (doc: ProductDocument): ProductRecord => {
  const productId = doc.id ?? doc._id;
  const noteIds = Array.isArray((doc as unknown as { noteIds?: unknown }).noteIds)
    ? ((doc as unknown as { noteIds: string[] }).noteIds)
    : [];
  const fallbackAssignedAt = doc.updatedAt instanceof Date
    ? doc.updatedAt.toISOString()
    : ((doc.updatedAt as unknown as string) || new Date().toISOString());
  const tags = normalizeTagRelations(doc.tags, productId, fallbackAssignedAt);
  const producers = normalizeProducerRelations(doc.producers, productId, fallbackAssignedAt);

  return {
    id: productId,
    sku: doc.sku ?? null,
    baseProductId: doc.baseProductId ?? null,
    defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
    ean: doc.ean ?? null,
    gtin: doc.gtin ?? null,
    asin: doc.asin ?? null,
    name: doc.name || { en: doc.name_en ?? '', pl: doc.name_pl ?? null, de: doc.name_de ?? null },
    description: doc.description || { en: doc.description_en ?? '', pl: doc.description_pl ?? null, de: doc.description_de ?? null },
    name_en: doc.name_en ?? null,
    name_pl: doc.name_pl ?? null,
    name_de: doc.name_de ?? null,
    description_en: doc.description_en ?? null,
    description_pl: doc.description_pl ?? null,
    description_de: doc.description_de ?? null,
    supplierName: doc.supplierName ?? null,
    supplierLink: doc.supplierLink ?? null,
    priceComment: doc.priceComment ?? null,
    stock: doc.stock ?? null,
    price: doc.price ?? null,
    sizeLength: doc.sizeLength ?? null,
    sizeWidth: doc.sizeWidth ?? null,
    weight: doc.weight ?? null,
    length: doc.length ?? null,
    published: doc.published ?? false,
    catalogId: doc.catalogId ?? '',
    parameters: Array.isArray(doc.parameters) ? doc.parameters : [],
    imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
    imageBase64s: Array.isArray(doc.imageBase64s) ? doc.imageBase64s : [],
    noteIds,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : (doc.createdAt as unknown as string),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : (doc.updatedAt as unknown as string),
    categoryId: resolveCategoryId(doc),
    tags,
    producers,
    images: Array.isArray(doc.images) ? doc.images : [],
  };
};

const buildSearchFilter = (filters: ProductFilters): Filter<ProductDocument> => {
  const filter: Filter<ProductDocument> = {};
  const andConditions: Filter<ProductDocument>[] = [];

  if (filters.sku) {
    filter.sku = { $regex: filters.sku, $options: 'i' };
  }

  if (filters.search) {
    const regex = { $regex: filters.search, $options: 'i' };
    // If a specific language is selected, only search in that language's name field
    if (filters.searchLanguage) {
      // searchLanguage is like "name_en", "name_pl", "name_de"
      andConditions.push({ $or: [{ [filters.searchLanguage]: regex }] });
    } else {
      // Search all language fields
      andConditions.push({
        $or: [
          { name_en: regex },
          { name_pl: regex },
          { name_de: regex },
          { description_en: regex },
          { description_pl: regex },
          { description_de: regex },
        ],
      });
    }
  }

  if (filters.description) {
    const regex = { $regex: filters.description, $options: 'i' };
    andConditions.push({
      $or: [
        { description_en: regex },
        { description_pl: regex },
        { description_de: regex },
      ],
    });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    filter.price = {};
    if (filters.minPrice !== undefined) {
      filter.price.$gte = filters.minPrice;
    }
    if (filters.maxPrice !== undefined) {
      filter.price.$lte = filters.maxPrice;
    }
  }

  if (filters.startDate || filters.endDate) {
    filter.createdAt = {};
    if (filters.startDate) {
      filter.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      filter.createdAt.$lte = new Date(filters.endDate);
    }
  }

  if (filters.catalogId) {
    if (filters.catalogId === 'unassigned') {
      andConditions.push({
        $or: [
          { catalogs: { $exists: false } },
          { catalogs: { $size: 0 } },
        ],
      });
    } else {
      andConditions.push({
        $or: [
          { catalogs: { $elemMatch: { catalogId: filters.catalogId } } },
        ],
      });
    }
  }

  if (filters.categoryId) {
    andConditions.push({
      $or: [
        { categoryId: filters.categoryId },
        { 'categories.categoryId': filters.categoryId },
      ],
    });
  }

  if (andConditions.length === 1) {
    Object.assign(filter, andConditions[0]!);
  } else if (andConditions.length > 1) {
    filter.$and = andConditions;
  }

  return filter;
};

export const mongoProductRepository: ProductRepository = {
  async getProducts(filters: ProductFilters) {
    const collection = await getProductCollection();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const limit = pageSize;
    const searchFilter = await applyBaseExportedFilter(
      buildSearchFilter(filters),
      filters.baseExported
    );
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
        .aggregate<ProductDocument>(pipeline, aggregateOptions)
        .toArray();
      return docs.map(toProductResponse);
    }

    let cursor = collection.find(searchFilter).sort({ createdAt: -1 });
    if (isEmptyFilter(searchFilter)) {
      cursor = cursor.hint({ createdAt: -1 });
    }
    cursor = cursor.skip(skip).limit(limit);
    const docs = await cursor.toArray();
    return docs.map(toProductResponse);
  },

  async countProducts(filters: ProductFilters) {
    const collection = await getProductCollection();
    const searchFilter = await applyBaseExportedFilter(
      buildSearchFilter(filters),
      filters.baseExported
    );
    if (isEmptyFilter(searchFilter)) {
      return collection.estimatedDocumentCount();
    }
    return collection.countDocuments(searchFilter);
  },

  async getProductById(id: string) {
    const collection = await getProductCollection();
    const doc = await collection.findOne(buildProductIdFilter(id));
    return doc ? toProductResponse({ ...doc, _id: doc._id }) : null;
  },

  async getProductBySku(sku: string) {
    const collection = await getProductCollection();
    const doc = await collection.findOne({ sku });
    return doc ? toProductBase(doc) : null;
  },

  async findProductByBaseId(baseProductId: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ baseProductId });
    return doc ? toProductBase(doc) : null;
  },

  async createProduct(data: CreateProductInput) {
    const db = await getMongoDb();
    const now = new Date();
    const id = randomUUID();
    if (data.sku) {
      const existing = await db
        .collection<ProductDocument>(productCollectionName)
        .findOne({ sku: data.sku });
      if (existing) {
        throw conflictError('A product with this SKU already exists.', {
          sku: data.sku,
          productId: existing.id ?? existing._id,
        });
      }
    }
    const document: ProductDocument = {
      _id: id,
      id,
      sku: typeof data.sku === 'string' ? data.sku : null,
      baseProductId:
        typeof data.baseProductId === 'string' ? data.baseProductId : null,
      defaultPriceGroupId:
        typeof data.defaultPriceGroupId === 'string'
          ? data.defaultPriceGroupId
          : null,
      ean: typeof data.ean === 'string' ? data.ean : null,
      gtin: typeof data.gtin === 'string' ? data.gtin : null,
      asin: typeof data.asin === 'string' ? data.asin : null,
      name_en: typeof data.name_en === 'string' ? data.name_en : null,
      name_pl: typeof data.name_pl === 'string' ? data.name_pl : null,
      name_de: typeof data.name_de === 'string' ? data.name_de : null,
      description_en:
        typeof data.description_en === 'string' ? data.description_en : null,
      description_pl:
        typeof data.description_pl === 'string' ? data.description_pl : null,
      description_de:
        typeof data.description_de === 'string' ? data.description_de : null,
      supplierName:
        typeof data.supplierName === 'string' ? data.supplierName : null,
      supplierLink:
        typeof data.supplierLink === 'string' ? data.supplierLink : null,
      priceComment:
        typeof data.priceComment === 'string' ? data.priceComment : null,
      stock: typeof data.stock === 'number' ? data.stock : null,
      price: typeof data.price === 'number' ? data.price : null,
      categoryId: typeof data.categoryId === 'string' ? data.categoryId : null,
      sizeLength: typeof data.sizeLength === 'number' ? data.sizeLength : null,
      sizeWidth: typeof data.sizeWidth === 'number' ? data.sizeWidth : null,
      weight: typeof data.weight === 'number' ? data.weight : null,
      length: typeof data.length === 'number' ? data.length : null,
      parameters: normalizeProductParameterValues(data.parameters),
      imageLinks: Array.isArray(data.imageLinks) ? data.imageLinks : [],
      imageBase64s: Array.isArray(data.imageBase64s) ? data.imageBase64s : [],
      noteIds: [],
      createdAt: now,
      updatedAt: now,
      images: [],
      catalogs: [],
    };
    await db
      .collection<ProductDocument>(productCollectionName)
      .insertOne(document);
    return toProductBase(document);
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    const db = await getMongoDb();
    const updateDoc: Partial<ProductDocument> = {
      updatedAt: new Date(),
      ...(data.sku !== undefined ? { sku: data.sku ?? null } : null),
      ...(data.baseProductId !== undefined
        ? { baseProductId: data.baseProductId ?? null }
        : null),
      ...(data.defaultPriceGroupId !== undefined
        ? { defaultPriceGroupId: data.defaultPriceGroupId ?? null }
        : null),
      ...(data.ean !== undefined ? { ean: data.ean ?? null } : null),
      ...(data.gtin !== undefined ? { gtin: data.gtin ?? null } : null),
      ...(data.asin !== undefined ? { asin: data.asin ?? null } : null),
      ...(data.name_en !== undefined ? { name_en: data.name_en ?? null } : null),
      ...(data.name_pl !== undefined ? { name_pl: data.name_pl ?? null } : null),
      ...(data.name_de !== undefined ? { name_de: data.name_de ?? null } : null),
      ...(data.description_en !== undefined
        ? { description_en: data.description_en ?? null }
        : null),
      ...(data.description_pl !== undefined
        ? { description_pl: data.description_pl ?? null }
        : null),
      ...(data.description_de !== undefined
        ? { description_de: data.description_de ?? null }
        : null),
      ...(data.supplierName !== undefined
        ? { supplierName: data.supplierName ?? null }
        : null),
      ...(data.supplierLink !== undefined
        ? { supplierLink: data.supplierLink ?? null }
        : null),
      ...(data.priceComment !== undefined
        ? { priceComment: data.priceComment ?? null }
        : null),
      ...(data.stock !== undefined ? { stock: data.stock ?? null } : null),
      ...(data.price !== undefined ? { price: data.price ?? null } : null),
      ...(data.sizeLength !== undefined
        ? { sizeLength: data.sizeLength ?? null }
        : null),
      ...(data.sizeWidth !== undefined
        ? { sizeWidth: data.sizeWidth ?? null }
        : null),
      ...(data.weight !== undefined ? { weight: data.weight ?? null } : null),
      ...(data.length !== undefined ? { length: data.length ?? null } : null),
      ...(data.parameters !== undefined
        ? {
          parameters: normalizeProductParameterValues(data.parameters),
        }
        : null),
      ...(data.imageLinks !== undefined
        ? {
          imageLinks: Array.isArray(data.imageLinks)
            ? data.imageLinks
            : [],
        }
        : null),
      ...(data.imageBase64s !== undefined
        ? {
          imageBase64s: Array.isArray(data.imageBase64s)
            ? data.imageBase64s
            : [],
        }
        : null),
    };
    const result = await db
      .collection<ProductDocument>(productCollectionName)
      .findOneAndUpdate(
        buildProductIdFilter(id),
        { $set: updateDoc },
        { returnDocument: 'after' }
      );
    if (!result) return null;
    return toProductBase({
      ...(result as ProductDocument),
      id: (result as ProductDocument).id ?? id,
    });
  },

  async deleteProduct(id: string) {
    const db = await getMongoDb();
    const result = await db
      .collection<ProductDocument>(productCollectionName)
      .findOneAndDelete(buildProductIdFilter(id));
    if (!result) return null;
    return toProductBase({
      ...(result as ProductDocument),
      id: (result as ProductDocument).id ?? id,
    });
  },

  async duplicateProduct(id: string, sku: string) {
    const db = await getMongoDb();
    const existing = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne(buildProductIdFilter(id));
    if (!existing) return null;

    const skuExists = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ sku });
    if (skuExists) {
      throw conflictError('A product with this SKU already exists.', {
        sku,
        productId: skuExists.id ?? skuExists._id,
      });
    }

    const now = new Date();
    const duplicatedId = randomUUID();
    const document: ProductDocument = {
      _id: duplicatedId,
      id: duplicatedId,
      sku,
      baseProductId: null,
      defaultPriceGroupId: existing.defaultPriceGroupId ?? null,
      ean: existing.ean ?? null,
      gtin: existing.gtin ?? null,
      asin: existing.asin ?? null,
      name_en: existing.name_en ?? null,
      name_pl: existing.name_pl ?? null,
      name_de: existing.name_de ?? null,
      description_en: existing.description_en ?? null,
      description_pl: existing.description_pl ?? null,
      description_de: existing.description_de ?? null,
      supplierName: existing.supplierName ?? null,
      supplierLink: existing.supplierLink ?? null,
      priceComment: existing.priceComment ?? null,
      stock: existing.stock ?? null,
      price: existing.price ?? null,
      categoryId: existing.categoryId ?? null,
      sizeLength: existing.sizeLength ?? null,
      sizeWidth: existing.sizeWidth ?? null,
      weight: existing.weight ?? null,
      length: existing.length ?? null,
      parameters: Array.isArray(existing.parameters) ? existing.parameters : [],
      imageLinks: Array.isArray(existing.imageLinks) ? existing.imageLinks : [],
      imageBase64s: Array.isArray(existing.imageBase64s) ? existing.imageBase64s : [],
      noteIds: Array.isArray((existing as unknown as { noteIds?: unknown }).noteIds)
        ? ((existing as unknown as { noteIds: string[] }).noteIds)
        : [],
      createdAt: now,
      updatedAt: now,
      images: [],
      catalogs: [],
    };

    await db
      .collection<ProductDocument>(productCollectionName)
      .insertOne(document);
    return toProductBase(document);
  },

  async addProductImages(productId: string, imageFileIds: string[]) {
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    if (normalizedIds.length === 0) return;
    const db = await getMongoDb();
    const imageFiles = await mongoImageFileRepository.findImageFilesByIds(
      normalizedIds
    );
    const now = new Date();
    const incoming = imageFiles.map((imageFile: ImageFileRecord) => ({
      productId,
      imageFileId: imageFile.id,
      assignedAt: now.toISOString(),
      imageFile,
    }));
    const product = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne(buildProductIdFilter(productId));
    const existing = Array.isArray(product?.images) ? product.images : [];
    const merged = [
      ...existing.filter(
        (entry: ProductImageRecord) =>
          !incoming.some(
            (next: ProductImageRecord) => next.imageFileId === entry.imageFileId
          )
      ),
      ...incoming,
    ];
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { images: merged, updatedAt: new Date() } }
      );
  },

  async replaceProductImages(productId: string, imageFileIds: string[]) {
    const normalizedIds = normalizeImageFileIds(imageFileIds);
    const db = await getMongoDb();
    if (normalizedIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { images: [], updatedAt: new Date() } }
        );
      return;
    }

    const imageFiles = await mongoImageFileRepository.findImageFilesByIds(
      normalizedIds
    );
    const imageFileById = new Map<string, ImageFileRecord>(
      imageFiles.map((imageFile: ImageFileRecord) => [imageFile.id, imageFile])
    );
    const now = new Date();
    const images: ProductImageRecord[] = [];
    normalizedIds.forEach((imageFileId: string, index: number): void => {
      const imageFile = imageFileById.get(imageFileId);
      if (!imageFile) return;
      images.push({
        productId,
        imageFileId,
        assignedAt: new Date(now.getTime() - index).toISOString(),
        imageFile,
      });
    });

    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { images, updatedAt: new Date() } }
      );
  },

  async replaceProductCatalogs(productId: string, catalogIds: string[]) {
    const db = await getMongoDb();
    if (catalogIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { catalogs: [], updatedAt: new Date() } }
        );
      return;
    }
    const uniqueIds = Array.from(new Set(catalogIds));
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(uniqueIds);
    const now = new Date();
    const catalogEntries = catalogs.map((catalog: CatalogRecord) => ({
      productId,
      catalogId: catalog.id,
      assignedAt: now.toISOString(),
      catalog,
    }));
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { catalogs: catalogEntries, updatedAt: new Date() } }
      );
  },

  async replaceProductCategory(productId: string, categoryId: string | null) {
    const db = await getMongoDb();
    const normalized = typeof categoryId === 'string' ? categoryId.trim() : '';
    if (!normalized) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { categories: [], categoryId: null, updatedAt: new Date() } }
        );
      return;
    }
    const categories = await db
      .collection('product_categories')
      .find({ id: normalized })
      .toArray();
    if (categories.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { categories: [], categoryId: null, updatedAt: new Date() } }
        );
      return;
    }
    const now = new Date();
    const categoryEntries = [
      {
        productId,
        categoryId: (categories[0] as unknown as { id: string }).id,
        assignedAt: now.toISOString(),
      },
    ];
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { categories: categoryEntries, categoryId: categoryEntries[0]?.categoryId ?? null, updatedAt: new Date() } }
      );
  },

  async replaceProductTags(productId: string, tagIds: string[]) {
    const db = await getMongoDb();
    if (tagIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { tags: [], updatedAt: new Date() } }
        );
      return;
    }
    const uniqueIds = Array.from(new Set(tagIds));
    const tags = await db
      .collection('product_tags')
      .find({ id: { $in: uniqueIds } })
      .toArray();
    const now = new Date();
    const tagEntries = tags.map((tag: Document) => ({
      productId,
      tagId: (tag as unknown as { id: string }).id,
      assignedAt: now.toISOString(),
    }));
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { tags: tagEntries, updatedAt: new Date() } }
      );
  },

  async replaceProductProducers(productId: string, producerIds: string[]) {
    const db = await getMongoDb();
    if (producerIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          buildProductIdFilter(productId),
          { $set: { producers: [], updatedAt: new Date() } }
        );
      return;
    }
    const uniqueIds = Array.from(new Set(producerIds));
    const producers = await db
      .collection('product_producers')
      .find({ id: { $in: uniqueIds } })
      .toArray();
    const now = new Date();
    const producerEntries = producers.map((producer: Document) => ({
      productId,
      producerId: (producer as unknown as { id: string }).id,
      assignedAt: now.toISOString(),
    }));
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { producers: producerEntries, updatedAt: new Date() } }
      );
  },

  async replaceProductNotes(productId: string, noteIds: string[]) {
    const db = await getMongoDb();
    const uniqueIds = Array.from(
      new Set(noteIds.map((id: string) => id.trim()).filter((id: string) => id.length > 0)),
    );
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        { $set: { noteIds: uniqueIds, updatedAt: new Date() } },
      );
  },

  async removeProductImage(productId: string, imageFileId: string) {
    const db = await getMongoDb();
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        buildProductIdFilter(productId),
        {
          $pull: {
            images: {
              imageFileId,
            },
          },
        }
      );
  },

  async countProductsByImageFileId(imageFileId: string) {
    const db = await getMongoDb();
    return db
      .collection<ProductDocument>(productCollectionName)
      .countDocuments({ 'images.imageFileId': imageFileId });
  },

  async createProductInTransaction<T>(
    callback: (tx: TransactionalProductRepository & Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    // MongoDB transactions are not natively supported in this setup.
    // Call the callback with the repository itself.
    return callback(this as unknown as TransactionalProductRepository & Prisma.TransactionClient);
  },
};
