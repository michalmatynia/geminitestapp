import "server-only";

import { randomUUID } from "crypto";
import type { Document, Filter, WithId } from "mongodb";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { conflictError } from "@/shared/errors/app-error";
import type { ProductRecord, ProductWithImages, ProductImageRecord, CatalogRecord } from "@/features/products/types";
import type { ImageFileRecord } from "@/shared/types/files";
import { mongoCatalogRepository } from "@/features/products/services/catalog-repository/mongo-catalog-repository";
import { mongoImageFileRepository } from "@/features/files/server";
import type {
  CreateProductInput,
  ProductFilters,
  ProductRepository,
  UpdateProductInput,
} from "@/features/products/types/services/product-repository";

type ProductDocument = Omit<ProductRecord, "createdAt" | "updatedAt"> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  images?: ProductWithImages["images"];
  catalogs?: ProductWithImages["catalogs"];
  categories?: ProductWithImages["categories"];
  tags?: ProductWithImages["tags"];
  producers?: ProductWithImages["producers"];
};

const productCollectionName = "products";

const toProductResponse = (doc: WithId<ProductDocument>): ProductWithImages => ({
  id: doc.id ?? doc._id,
  sku: doc.sku ?? null,
  baseProductId: doc.baseProductId ?? null,
  defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
  ean: doc.ean ?? null,
  gtin: doc.gtin ?? null,
  asin: doc.asin ?? null,
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
  parameters: Array.isArray(doc.parameters) ? doc.parameters : [],
  imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
  imageBase64s: Array.isArray(doc.imageBase64s) ? doc.imageBase64s : [],
  noteIds: Array.isArray((doc as unknown as { noteIds?: unknown }).noteIds)
    ? ((doc as unknown as { noteIds: string[] }).noteIds)
    : [],
  createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : (doc.createdAt as unknown as string),
  updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : (doc.updatedAt as unknown as string),
  images: Array.isArray(doc.images) ? doc.images : [],
  catalogs: Array.isArray(doc.catalogs) ? doc.catalogs : [],
  categories: Array.isArray(doc.categories) ? doc.categories : [],
  tags: Array.isArray(doc.tags) ? doc.tags : [],
  producers: Array.isArray(doc.producers) ? doc.producers : [],
});

const toProductBase = (doc: ProductDocument): ProductRecord => ({
  id: doc.id ?? doc._id,
  sku: doc.sku ?? null,
  baseProductId: doc.baseProductId ?? null,
  defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
  ean: doc.ean ?? null,
  gtin: doc.gtin ?? null,
  asin: doc.asin ?? null,
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
  parameters: Array.isArray(doc.parameters) ? doc.parameters : [],
  imageLinks: Array.isArray(doc.imageLinks) ? doc.imageLinks : [],
  imageBase64s: Array.isArray(doc.imageBase64s) ? doc.imageBase64s : [],
  noteIds: Array.isArray((doc as unknown as { noteIds?: unknown }).noteIds)
    ? ((doc as unknown as { noteIds: string[] }).noteIds)
    : [],
  createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : (doc.createdAt as unknown as string),
  updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : (doc.updatedAt as unknown as string),
});

const buildSearchFilter = (filters: ProductFilters): Filter<ProductDocument> => {
  const filter: Filter<ProductDocument> = {};
  const andConditions: Filter<ProductDocument>[] = [];

  if (filters.sku) {
    filter.sku = { $regex: filters.sku, $options: "i" };
  }

  if (filters.search) {
    const regex = { $regex: filters.search, $options: "i" };
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

  if (filters.minPrice || filters.maxPrice) {
    filter.price = {};
    if (filters.minPrice) {
      filter.price.$gte = parseInt(filters.minPrice, 10);
    }
    if (filters.maxPrice) {
      filter.price.$lte = parseInt(filters.maxPrice, 10);
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
    if (filters.catalogId === "unassigned") {
      // Backward compatibility:
      // older documents may store catalog relation in different fields/shapes.
      andConditions.push({
        $or: [
          { catalogs: { $exists: false } },
          { catalogs: { $size: 0 } },
          { catalogIds: { $exists: false } },
          { catalogIds: { $size: 0 } },
          { catalogId: { $exists: false } },
          { catalogId: null as unknown as string },
          { catalogId: "" },
        ],
      });
    } else {
      // Support multiple historical schemas:
      // - catalogs: [{ catalogId: string, ... }]
      // - catalogs: [{ id: string, ... }]
      // - catalogs: string[]
      // - catalogIds: string[]
      // - catalogId: string
      andConditions.push({
        $or: [
          { catalogs: { $elemMatch: { catalogId: filters.catalogId } } },
          { catalogs: { $elemMatch: { id: filters.catalogId } } },
          { catalogIds: filters.catalogId },
          { catalogId: filters.catalogId },
        ],
      });
    }
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
    const db = await getMongoDb();
    const page = filters.page ? parseInt(filters.page, 10) : undefined;
    const pageSize = filters.pageSize ? parseInt(filters.pageSize, 10) : undefined;
    const skip = page && pageSize ? (page - 1) * pageSize : undefined;
    const limit = pageSize;

    let cursor = db
      .collection<ProductDocument>(productCollectionName)
      .find(buildSearchFilter(filters))
      .sort({ createdAt: -1 });

    if (skip !== undefined) {
      cursor = cursor.skip(skip);
    }
    if (limit !== undefined) {
      cursor = cursor.limit(limit);
    }

    const docs = await cursor.toArray();
    return docs.map(toProductResponse);
  },

  async countProducts(filters: ProductFilters) {
    const db = await getMongoDb();
    return db
      .collection<ProductDocument>(productCollectionName)
      .countDocuments(buildSearchFilter(filters));
  },

  async getProductById(id: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ $or: [{ _id: id }, { id }] });
    return doc ? toProductResponse({ ...doc, _id: doc._id }) : null;
  },

  async getProductBySku(sku: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ sku });
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
        throw conflictError("A product with this SKU already exists.", {
          sku: data.sku,
          productId: existing.id ?? existing._id,
        });
      }
    }
    const document: ProductDocument = {
      _id: id,
      id,
      sku: typeof data.sku === "string" ? data.sku : null,
      baseProductId:
        typeof data.baseProductId === "string" ? data.baseProductId : null,
      defaultPriceGroupId:
        typeof data.defaultPriceGroupId === "string"
          ? data.defaultPriceGroupId
          : null,
      ean: typeof data.ean === "string" ? data.ean : null,
      gtin: typeof data.gtin === "string" ? data.gtin : null,
      asin: typeof data.asin === "string" ? data.asin : null,
      name_en: typeof data.name_en === "string" ? data.name_en : null,
      name_pl: typeof data.name_pl === "string" ? data.name_pl : null,
      name_de: typeof data.name_de === "string" ? data.name_de : null,
      description_en:
        typeof data.description_en === "string" ? data.description_en : null,
      description_pl:
        typeof data.description_pl === "string" ? data.description_pl : null,
      description_de:
        typeof data.description_de === "string" ? data.description_de : null,
      supplierName:
        typeof data.supplierName === "string" ? data.supplierName : null,
      supplierLink:
        typeof data.supplierLink === "string" ? data.supplierLink : null,
      priceComment:
        typeof data.priceComment === "string" ? data.priceComment : null,
      stock: typeof data.stock === "number" ? data.stock : null,
      price: typeof data.price === "number" ? data.price : null,
      sizeLength: typeof data.sizeLength === "number" ? data.sizeLength : null,
      sizeWidth: typeof data.sizeWidth === "number" ? data.sizeWidth : null,
      weight: typeof data.weight === "number" ? data.weight : null,
      length: typeof data.length === "number" ? data.length : null,
      parameters: Array.isArray(data.parameters) ? (data.parameters as Array<{ parameterId: string; value?: string | null }>).map((p: { parameterId: string; value?: string | null }) => ({ parameterId: p.parameterId, value: p.value || "" })) : [],
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
            parameters: Array.isArray(data.parameters) ? (data.parameters as Array<{ parameterId: string; value?: string | null }>).map((p: { parameterId: string; value?: string | null }) => ({ parameterId: p.parameterId, value: p.value || "" })) : [],
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
        { $or: [{ _id: id }, { id }] },
        { $set: updateDoc },
        { returnDocument: "after" }
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
      .findOneAndDelete({ $or: [{ _id: id }, { id }] });
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
      .findOne({ $or: [{ _id: id }, { id }] });
    if (!existing) return null;

    const skuExists = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ sku });
    if (skuExists) {
      throw conflictError("A product with this SKU already exists.", {
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
    if (imageFileIds.length === 0) return;
    const db = await getMongoDb();
    const imageFiles = await mongoImageFileRepository.findImageFilesByIds(
      imageFileIds
    );
    const now = new Date();
    const incoming = imageFiles.map((imageFile: ImageFileRecord) => ({
      productId,
      imageFileId: imageFile.id,
      assignedAt: now,
      imageFile,
    }));
    const product = await db
      .collection<ProductDocument>(productCollectionName)
      .findOne({ $or: [{ _id: productId }, { id: productId }] });
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
        { $or: [{ _id: productId }, { id: productId }] },
        { $set: { images: merged, updatedAt: new Date() } }
      );
  },

  async replaceProductCatalogs(productId: string, catalogIds: string[]) {
    const db = await getMongoDb();
    if (catalogIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          { $or: [{ _id: productId }, { id: productId }] },
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
      assignedAt: now,
      catalog,
    }));
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        { $or: [{ _id: productId }, { id: productId }] },
        { $set: { catalogs: catalogEntries, updatedAt: new Date() } }
      );
  },

  async replaceProductCategories(productId: string, categoryIds: string[]) {
    const db = await getMongoDb();
    if (categoryIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          { $or: [{ _id: productId }, { id: productId }] },
          { $set: { categories: [], updatedAt: new Date() } }
        );
      return;
    }
    const uniqueIds = Array.from(new Set(categoryIds));
    const categories = await db
      .collection("product_categories")
      .find({ id: { $in: uniqueIds } })
      .toArray();
    const now = new Date();
    const categoryEntries = categories.map((category: Document) => ({
      productId,
      categoryId: (category as unknown as { id: string }).id,
      assignedAt: now,
    }));
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        { $or: [{ _id: productId }, { id: productId }] },
        { $set: { categories: categoryEntries, updatedAt: new Date() } }
      );
  },

  async replaceProductTags(productId: string, tagIds: string[]) {
    const db = await getMongoDb();
    if (tagIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          { $or: [{ _id: productId }, { id: productId }] },
          { $set: { tags: [], updatedAt: new Date() } }
        );
      return;
    }
    const uniqueIds = Array.from(new Set(tagIds));
    const tags = await db
      .collection("product_tags")
      .find({ id: { $in: uniqueIds } })
      .toArray();
    const now = new Date();
    const tagEntries = tags.map((tag: Document) => ({
      productId,
      tagId: (tag as unknown as { id: string }).id,
      assignedAt: now,
    }));
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        { $or: [{ _id: productId }, { id: productId }] },
        { $set: { tags: tagEntries, updatedAt: new Date() } }
      );
  },

  async replaceProductProducers(productId: string, producerIds: string[]) {
    const db = await getMongoDb();
    if (producerIds.length === 0) {
      await db
        .collection<ProductDocument>(productCollectionName)
        .updateOne(
          { $or: [{ _id: productId }, { id: productId }] },
          { $set: { producers: [], updatedAt: new Date() } }
        );
      return;
    }
    const uniqueIds = Array.from(new Set(producerIds));
    const producers = await db
      .collection("product_producers")
      .find({ id: { $in: uniqueIds } })
      .toArray();
    const now = new Date();
    const producerEntries = producers.map((producer: Document) => ({
      productId,
      producerId: (producer as unknown as { id: string }).id,
      assignedAt: now,
    }));
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        { $or: [{ _id: productId }, { id: productId }] },
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
        { $or: [{ _id: productId }, { id: productId }] },
        { $set: { noteIds: uniqueIds, updatedAt: new Date() } },
      );
  },

  async removeProductImage(productId: string, imageFileId: string) {
    const db = await getMongoDb();
    await db
      .collection<ProductDocument>(productCollectionName)
      .updateOne(
        { $or: [{ _id: productId }, { id: productId }] },
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
      .countDocuments({ "images.imageFileId": imageFileId });
  },
};
