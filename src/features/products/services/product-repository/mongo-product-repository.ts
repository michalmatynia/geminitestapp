import 'server-only';

import { randomUUID } from 'crypto';

import { Filter, type Document, WithId } from 'mongodb';

import { mongoImageFileRepository } from '@/features/files/server';
import { mongoCatalogRepository } from '@/features/products/services/catalog-repository/mongo-catalog-repository';
import {
  toProductBase,
  toProductResponse,
  type ProductDocument,
} from '@/features/products/services/product-repository/mongo-product-repository-mappers';
import type { ImageFileRecord } from '@/features/files';
import {
  type CatalogRecord,
  CreateProductInput,
  type ProductCreateInputDto,
  type ProductImageRecord,
  ProductFilters,
  type ProductWithImages,
  ProductRepository,
  TransactionalProductRepository,
  UpdateProductInput,
} from '@/shared/contracts/products';
import { conflictError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Prisma } from '@prisma/client';
import {
  buildProductIdFilter,
  buildLookupFilterForIds,
  isEmptyFilter,
  normalizeImageFileIds,
  normalizeLookupId,
  normalizeProductParameterValues,
  productCollectionName,
  buildCategoryLookupFilter,
  resolveLookupDocumentId,
} from './mongo-product-repository.helpers';
import { buildMongoWhere } from './mongo-product-repository.filters';

let productIndexesEnsured: Promise<void> | null = null;

const ensureProductIndexes = async (): Promise<void> => {
  if (!productIndexesEnsured) {
    productIndexesEnsured = (async (): Promise<void> => {
      const db = await getMongoDb();
      const collection = db.collection<ProductDocument>(productCollectionName);
      await Promise.all([
        // Single-field indexes for individual filter conditions
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
        // Composite indexes for the most common filter+sort combinations.
        collection.createIndex(
          { 'catalogs.catalogId': 1, createdAt: -1 },
          { name: 'products_catalogId_createdAt' }
        ),
        collection.createIndex(
          { categoryId: 1, createdAt: -1 },
          { name: 'products_categoryId_createdAt' }
        ),
        collection.createIndex(
          { 'catalogs.catalogId': 1, categoryId: 1, createdAt: -1 },
          { name: 'products_catalogId_categoryId_createdAt' }
        ),
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

const buildListProjectStage = (filters: ProductFilters): Document | null => {
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

export const mongoProductRepository: ProductRepository = {
  async getProducts(filters: ProductFilters) {
    const collection = await getProductCollection();
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
        .aggregate<WithId<ProductDocument>>(pipeline, aggregateOptions)
        .toArray();
       
      return docs.map((doc) => toProductResponse(doc));
    }

    let cursor = collection.find(searchFilter).sort({ createdAt: -1 });
    if (isEmptyFilter(searchFilter)) {
      cursor = cursor.hint({ createdAt: -1 });
    }
    cursor = cursor.skip(skip).limit(limit);
    const docs = await cursor.toArray();
     
    return docs.map((doc) => toProductResponse(doc));
  },

  async countProducts(filters: ProductFilters) {
    const collection = await getProductCollection();
    const searchFilter = await buildMongoWhere(filters);
    if (isEmptyFilter(searchFilter)) {
      return collection.estimatedDocumentCount();
    }
    return collection.countDocuments(searchFilter);
  },

  async getProductsWithCount(filters: ProductFilters): Promise<{ products: ProductWithImages[]; total: number }> {
    const collection = await getProductCollection();
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const skip = (page - 1) * pageSize;
    const searchFilter = await buildMongoWhere(filters);
    const projectStage = buildListProjectStage(filters);

    const [docs, total] = await Promise.all([
      (async () => {
        let cursor = collection.find(searchFilter).sort({ createdAt: -1 });
        if (isEmptyFilter(searchFilter)) {
          cursor = cursor.hint({ createdAt: -1 });
        }
        cursor = cursor.skip(skip).limit(pageSize);
        if (projectStage) {
          cursor = cursor.project<WithId<ProductDocument>>(projectStage);
        }
        return await cursor.toArray();
      })(),
      collection.countDocuments(searchFilter),
    ]);

    return {
      products: docs.map((doc) => toProductResponse(doc)),
      total,
    };
  },
  
  async getProductImages(productId: string) {
    const collection = await getProductCollection();
    const doc = await collection.findOne(buildProductIdFilter(productId), {
      projection: {
        _id: 1,
        id: 1,
        updatedAt: 1,
        images: 1,
      },
    });
    if (!doc || !Array.isArray(doc.images) || doc.images.length === 0) {
      return [];
    }

     
    const fallbackProductId = normalizeLookupId(doc.id ?? doc._id) || productId;
    const fallbackAssignedAt =
      doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date().toISOString();

    type ParsedImageEntry = {
      productId: string;
      imageFileId: string;
      assignedAt: string;
      imageFile?: ImageFileRecord;
    };

    const parsedEntries = doc.images.reduce<ParsedImageEntry[]>(
      (acc: ParsedImageEntry[], rawImage: unknown) => {
        if (!rawImage || typeof rawImage !== 'object') return acc;
        const imageRecord = rawImage as Record<string, unknown>;
         
        const imageFileId = normalizeLookupId(
          imageRecord['imageFileId'] ??
            (imageRecord['imageFile'] as { id?: unknown } | null | undefined)?.id
        );
        if (!imageFileId) return acc;

        const rawAssignedAt = imageRecord['assignedAt'];
        const assignedAt =
          rawAssignedAt instanceof Date
            ? rawAssignedAt.toISOString()
            : typeof rawAssignedAt === 'string' && rawAssignedAt.trim().length > 0
              ? rawAssignedAt
              : fallbackAssignedAt;

        const rawProductId = imageRecord['productId'];
         
        const entryProductId =
          normalizeLookupId(rawProductId) ||
          fallbackProductId;

        const rawImageFile = imageRecord['imageFile'];
        const imageFile =
          rawImageFile && typeof rawImageFile === 'object'
            ? (rawImageFile as ImageFileRecord)
            : undefined;

        acc.push({
          productId: entryProductId,
          imageFileId,
          assignedAt,
          ...(imageFile ? { imageFile } : {}),
        });
        return acc;
      },
      []
    );

    if (parsedEntries.length === 0) {
      return [];
    }

    const missingImageFileIds = Array.from(
      new Set(
        parsedEntries
          .filter((entry: ParsedImageEntry) => !entry.imageFile)
          .map((entry: ParsedImageEntry) => entry.imageFileId)
      )
    );

    const hydratedImageFiles =
      missingImageFileIds.length > 0
        ? await mongoImageFileRepository.findImageFilesByIds(missingImageFileIds)
        : [];
    const hydratedById = new Map<string, ImageFileRecord>(
      hydratedImageFiles.map((imageFile: ImageFileRecord) => [imageFile.id, imageFile])
    );

    return parsedEntries
      .map((entry: ParsedImageEntry): ProductImageRecord | null => {
        const imageFile = entry.imageFile ?? hydratedById.get(entry.imageFileId);
        if (!imageFile) return null;
        return {
          productId: entry.productId,
          imageFileId: entry.imageFileId,
          assignedAt: entry.assignedAt,
          imageFile,
        };
      })
      .filter((entry: ProductImageRecord | null): entry is ProductImageRecord => entry !== null)
      .sort((a: ProductImageRecord, b: ProductImageRecord) => {
        const aTime = Date.parse(a.assignedAt);
        const bTime = Date.parse(b.assignedAt);
        if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;
        return bTime - aTime;
      });
  },
  
  async getProductById(id: string) {
    const collection = await getProductCollection();
    const doc = await collection.findOne(buildProductIdFilter(id));
     
    return doc ? toProductResponse(doc) : null;
  },

  async getProductBySku(sku: string) {
    const collection = await getProductCollection();
    const doc = await collection.findOne({ sku });
     
    return doc ? toProductBase(doc) : null;
  },

  async getProductsBySkus(skus: string[]) {
    if (skus.length === 0) return [];
    const collection = await getProductCollection();
    const docs = await collection.find({ sku: { $in: skus } }).toArray();
    return docs.map(doc => toProductBase(doc));
  },

  async findProductByBaseId(baseProductId: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ baseProductId });
     
    return doc ? toProductBase(doc) : null;
  },

  async findProductsByBaseIds(baseIds: string[]) {
    if (baseIds.length === 0) return [];
    const db = await getMongoDb();
    const docs = await db
      .collection<ProductDocument>(productCollectionName)
      .find({ baseProductId: { $in: baseIds } })
      .toArray();
    return docs.map(doc => toProductBase(doc));
  },

  async bulkCreateProducts(data: ProductCreateInputDto[]) {
    if (data.length === 0) return 0;
    const db = await getMongoDb();
    const now = new Date();
    const docs = data.map((item) => {
      const id = item.id || randomUUID();
      return {
        _id: id,
        id,
        sku: typeof item.sku === 'string' ? item.sku : null,
        baseProductId:
          typeof item.baseProductId === 'string' ? item.baseProductId : null,
        defaultPriceGroupId:
          typeof item.defaultPriceGroupId === 'string'
            ? item.defaultPriceGroupId
            : null,
        ean: typeof item.ean === 'string' ? item.ean : null,
        gtin: typeof item.gtin === 'string' ? item.gtin : null,
        asin: typeof item.asin === 'string' ? item.asin : null,
        name_en: typeof item.name_en === 'string' ? item.name_en : null,
        name_pl: typeof item.name_pl === 'string' ? item.name_pl : null,
        name_de: typeof item.name_de === 'string' ? item.name_de : null,
        description_en:
          typeof item.description_en === 'string' ? item.description_en : null,
        description_pl:
          typeof item.description_pl === 'string' ? item.description_pl : null,
        description_de:
          typeof item.description_de === 'string' ? item.description_de : null,
        supplierName:
          typeof item.supplierName === 'string' ? item.supplierName : null,
        supplierLink:
          typeof item.supplierLink === 'string' ? item.supplierLink : null,
        priceComment:
          typeof item.priceComment === 'string' ? item.priceComment : null,
        stock: typeof item.stock === 'number' ? item.stock : null,
        price: typeof item.price === 'number' ? item.price : null,
        categoryId: typeof item.categoryId === 'string' ? item.categoryId : null,
        sizeLength: typeof item.sizeLength === 'number' ? item.sizeLength : null,
        sizeWidth: typeof item.sizeWidth === 'number' ? item.sizeWidth : null,
        weight: typeof item.weight === 'number' ? item.weight : null,
        length: typeof item.length === 'number' ? item.length : null,
        parameters: normalizeProductParameterValues(item.parameters),
        imageLinks: Array.isArray(item.imageLinks) ? item.imageLinks : [],
        imageBase64s: Array.isArray(item.imageBase64s) ? item.imageBase64s : [],
        noteIds: [],
        createdAt: now,
        updatedAt: now,
        images: [],
        catalogs: [],
      };
    });
    const result = await db
      .collection<ProductDocument>(productCollectionName)
      .insertMany(docs, { ordered: false });
    return result.insertedCount;
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
    return toProductBase(result);
  },

  async deleteProduct(id: string) {
    const db = await getMongoDb();
    const result = await db
      .collection<ProductDocument>(productCollectionName)
      .findOneAndDelete(buildProductIdFilter(id));
    if (!result) return null;
    return toProductBase(result);
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
       
      parameters: Array.isArray(existing.parameters) ? (existing.parameters) : [],
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

  async bulkReplaceProductCatalogs(productIds: string[], catalogIds: string[]) {
    const db = await getMongoDb();
    if (productIds.length === 0) return;
    const uniqueIds = Array.from(new Set(catalogIds));
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(uniqueIds);
    const now = new Date();
    const catalogEntries = catalogs.map((catalog: CatalogRecord) => ({
      catalogId: catalog.id,
      assignedAt: now.toISOString(),
      catalog,
    }));

    await db
      .collection<ProductDocument>(productCollectionName)
      .updateMany(
        { id: { $in: productIds } } as Filter<ProductDocument>,
        { 
          $set: { 
            catalogs: catalogEntries as ProductDocument['catalogs'], 
            updatedAt: new Date() 
          } 
        }
      );
  },

  async bulkAddProductCatalogs(productIds: string[], catalogIds: string[]) {
    const db = await getMongoDb();
    if (productIds.length === 0 || catalogIds.length === 0) return;
    const uniqueIds = Array.from(new Set(catalogIds));
    const catalogs = await mongoCatalogRepository.getCatalogsByIds(uniqueIds);
    const now = new Date();
    const catalogEntries = catalogs.map((catalog: CatalogRecord) => ({
      catalogId: catalog.id,
      assignedAt: now.toISOString(),
      catalog,
    }));

    await db
      .collection<ProductDocument>(productCollectionName)
      .updateMany(
        { id: { $in: productIds } } as Filter<ProductDocument>,
        {
          $addToSet: { catalogs: { $each: catalogEntries as NonNullable<ProductDocument['catalogs']> } },
          $set: { updatedAt: new Date() },
        }
      );
  },

  async bulkRemoveProductCatalogs(productIds: string[], catalogIds: string[]) {
    const db = await getMongoDb();
    if (productIds.length === 0 || catalogIds.length === 0) return;
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateMany(
        { id: { $in: productIds } } as Filter<ProductDocument>,
        {
          $pull: {
            catalogs: { catalogId: { $in: catalogIds } },
          } as unknown as import('mongodb').UpdateFilter<ProductDocument>['$pull'],
          $set: { updatedAt: new Date() },
        }
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
    const category = await db
      .collection('product_categories')
      .findOne(buildCategoryLookupFilter(normalized), {
        projection: { _id: 1, id: 1 },
      });
    const resolvedCategoryId = resolveLookupDocumentId(category);
    if (!resolvedCategoryId) {
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
        categoryId: resolvedCategoryId,
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
      .find(buildLookupFilterForIds(uniqueIds))
      .project({ _id: 1, id: 1 })
      .toArray();
    const now = new Date();
    const seenTagIds = new Set<string>();
    const tagEntries = tags.reduce(
      (acc: Array<{ productId: string; tagId: string; assignedAt: string }>, tag: Document) => {
        const tagId = resolveLookupDocumentId(tag);
        if (!tagId || seenTagIds.has(tagId)) return acc;
        seenTagIds.add(tagId);
        acc.push({
          productId,
          tagId,
          assignedAt: now.toISOString(),
        });
        return acc;
      },
      []
    );
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
      .find(buildLookupFilterForIds(uniqueIds))
      .project({ _id: 1, id: 1 })
      .toArray();
    const now = new Date();
    const seenProducerIds = new Set<string>();
    const producerEntries = producers.reduce(
      (
        acc: Array<{ productId: string; producerId: string; assignedAt: string }>,
        producer: Document
      ) => {
        const producerId = resolveLookupDocumentId(producer);
        if (!producerId || seenProducerIds.has(producerId)) return acc;
        seenProducerIds.add(producerId);
        acc.push({
          productId,
          producerId,
          assignedAt: now.toISOString(),
        });
        return acc;
      },
      []
    );
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
          } as import('mongodb').UpdateFilter<ProductDocument>['$pull']
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
     
    return callback(this as unknown as TransactionalProductRepository & Prisma.TransactionClient);
  },
};
